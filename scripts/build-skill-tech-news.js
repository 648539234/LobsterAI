/**
 * Build script for technology-news-search skill.
 *
 * Bundles `rss-parser` (and its transitive deps) into a single CommonJS file
 * so the skill can run without external node_modules or NODE_PATH.
 *
 * Cross-platform: works on macOS, Windows, and Linux.
 */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outfile = path.resolve(
  __dirname,
  '..',
  'SKILLs/technology-news-search/scripts/vendor/rss-parser.bundle.js'
);

esbuild.buildSync({
  stdin: {
    contents: 'module.exports = require("rss-parser");',
    resolveDir: path.resolve(__dirname, '..'),
  },
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile,
  minify: true,
});

// esbuild outputs CRLF on Windows — normalize to LF for git consistency
const content = fs.readFileSync(outfile, 'utf-8');
fs.writeFileSync(outfile, content.replace(/\r\n/g, '\n'), 'utf-8');

console.log('Built rss-parser.bundle.js');
