const { DateTime } = require("luxon");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginBundle = require("@11ty/eleventy-plugin-bundle");
const pluginNavigation = require("@11ty/eleventy-navigation");
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const sectionizePlugin = require("./_plugins/eleventy-plugin-sectionize");

module.exports = function(eleventyConfig) {
  // Consolidate all assets into /assets/
  eleventyConfig.addPassthroughCopy("assets");

  // Explicitly map root-level files that need to stay at the root for SEO and icons
  eleventyConfig.addPassthroughCopy({
    "assets/favicon.ico": "/favicon.ico",
    "assets/apple-touch-icon.png": "/apple-touch-icon.png",
    "assets/favicon-32x32.png": "/favicon-32x32.png",
    "assets/favicon-16x16.png": "/favicon-16x16.png",
    "assets/site.webmanifest": "/site.webmanifest",
    "assets/android-chrome-192x192.png": "/android-chrome-192x192.png",
    "assets/android-chrome-512x512.png": "/android-chrome-512x512.png"
  });

  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);


  eleventyConfig.addPlugin(sectionizePlugin);

  eleventyConfig.addTemplateFormats("md");
  
  eleventyConfig.addLayoutAlias("default", "default.njk");

  eleventyConfig.addGlobalData("layout", "default");

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "njk",
  };
};
