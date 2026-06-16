export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const { name, email, message, 'cf-turnstile-response': turnstileToken } = data;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Email domain validation (check for MX records)
    const domain = email.split('@')[1];
    try {
      const dnsResponse = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`, {
        headers: {
          'Accept': 'application/dns-json'
        }
      });
      
      if (dnsResponse.ok) {
        const dnsData = await dnsResponse.json();
        if (!dnsData.Answer || dnsData.Answer.length === 0) {
          return new Response(JSON.stringify({ error: "Invalid email domain. The domain does not accept emails." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    } catch (e) {
      console.error("DNS check failed", e);
      // Proceed if DNS DoH fails to avoid blocking legitimate users due to third-party outage
    }

    // 3. Cloudflare Turnstile Verification
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      return new Response(JSON.stringify({ error: "Server configuration error: missing Turnstile secret" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!turnstileToken) {
      return new Response(JSON.stringify({ error: "Please complete the anti-spam challenge" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const turnstileFormData = new FormData();
    turnstileFormData.append('secret', turnstileSecret);
    turnstileFormData.append('response', turnstileToken);
    
    // Optional: add remoteip for stronger verification
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) {
      turnstileFormData.append('remoteip', ip);
    }

    const turnstileResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: turnstileFormData
    });

    const turnstileOutcome = await turnstileResult.json();
    if (!turnstileOutcome.success) {
      return new Response(JSON.stringify({ error: "Anti-spam verification failed. Please try again." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 4. Send Email via Resend
    const resendApiKey = env.RESEND_API_KEY;
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Default to a verified domain email if set, otherwise use what's available
    const fromEmail = env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    // Default to the broker's email (where messages should be sent)
    const toEmail = env.RESEND_TO_EMAIL || "ca.bry.85@gmail.com"; 

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `Contact Form <${fromEmail}>`,
        to: [toEmail],
        reply_to: email,
        subject: `New Contact Form Submission from ${name}`,
        html: `
          <h3>New Message from your Website</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API Error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
