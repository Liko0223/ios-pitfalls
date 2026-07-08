import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const dataPath = path.join(root, "data", "pitfalls.json");
const skillDataPath = path.join(root, "ios-pitfalls-diagnose", "references", "pitfalls.json");
const siteDataPath = path.join(root, "site", "pitfalls.json");
const siteIndexPath = path.join(root, "site", "index.html");
const skillSourcePath = path.join(root, "ios-pitfalls-diagnose", "references", "source.md");
const defaultSourcePath = "/Users/lilinke/Library/Mobile Documents/iCloud~md~obsidian/Documents/PKM/02-Wiki/concepts/iOS 开发踩坑记录.md";
const sourcePath = process.env.IOS_PITFALLS_SOURCE || defaultSourcePath;

const jsonText = fs.readFileSync(dataPath, "utf8").trim();
const data = JSON.parse(jsonText);
const pretty = JSON.stringify(data, null, 2) + "\n";

fs.writeFileSync(dataPath, pretty);
fs.writeFileSync(skillDataPath, pretty);
fs.writeFileSync(siteDataPath, pretty);

if (fs.existsSync(sourcePath)) {
  fs.copyFileSync(sourcePath, skillSourcePath);
}

let html = fs.readFileSync(siteIndexPath, "utf8");
html = html.replace(
  /<script id="pitfall-data" type="application\/json">[\s\S]*?<\/script>/,
  `<script id="pitfall-data" type="application/json">\n${pretty.trim()}\n  </script>`
);
if (!html.includes('<script id="pitfall-data" type="application/json">')) {
  throw new Error("site/index.html is missing the embedded pitfall-data script");
}
fs.writeFileSync(siteIndexPath, html);

console.log(`Synced ${data.pitfalls.length} pitfalls.`);
