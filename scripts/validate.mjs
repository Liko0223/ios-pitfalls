import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const dataPath = path.join(root, "data", "pitfalls.json");
const skillDataPath = path.join(root, "ios-pitfalls-diagnose", "references", "pitfalls.json");
const siteIndexPath = path.join(root, "site", "index.html");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function fail(message) {
  throw new Error(message);
}

const data = readJson(dataPath);
const skillData = readJson(skillDataPath);
const html = fs.readFileSync(siteIndexPath, "utf8");
const embeddedMatch = html.match(/<script id="pitfall-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!embeddedMatch) fail("site/index.html is missing embedded pitfall-data");
const embeddedData = JSON.parse(embeddedMatch[1]);

if (JSON.stringify(data) !== JSON.stringify(skillData)) {
  fail("Skill references/pitfalls.json differs from data/pitfalls.json");
}
if (JSON.stringify(data) !== JSON.stringify(embeddedData)) {
  fail("Embedded site data differs from data/pitfalls.json");
}

const categoryIds = new Set(data.categories.map((category) => category.id));
const pitfallIds = new Set();
const requiredStringFields = ["id", "category", "severity", "title", "titleEn", "symptom", "symptomEn", "rootCause", "rootCauseEn", "avoid", "avoidEn"];
const requiredArrayFields = ["check", "checkEn", "fix", "fixEn", "agentKeywords"];

for (const pitfall of data.pitfalls) {
  for (const field of requiredStringFields) {
    if (typeof pitfall[field] !== "string" || !pitfall[field].trim()) {
      fail(`${pitfall.id || "(missing id)"} missing string field: ${field}`);
    }
  }
  for (const field of requiredArrayFields) {
    if (!Array.isArray(pitfall[field]) || pitfall[field].length === 0) {
      fail(`${pitfall.id} missing non-empty array field: ${field}`);
    }
  }
  if (pitfall.check.length !== pitfall.checkEn.length) {
    fail(`${pitfall.id} check and checkEn length mismatch`);
  }
  if (pitfall.fix.length !== pitfall.fixEn.length) {
    fail(`${pitfall.id} fix and fixEn length mismatch`);
  }
  if (!categoryIds.has(pitfall.category)) {
    fail(`${pitfall.id} references unknown category: ${pitfall.category}`);
  }
  if (pitfallIds.has(pitfall.id)) {
    fail(`Duplicate pitfall id: ${pitfall.id}`);
  }
  pitfallIds.add(pitfall.id);
}

console.log(`Validated ${data.pitfalls.length} pitfalls across ${data.categories.length} categories.`);
