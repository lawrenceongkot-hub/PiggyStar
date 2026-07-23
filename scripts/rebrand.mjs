import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Extensions to scan
const extensions = new Set([
".tsx", ".ts", ".js", ".mjs", ".cjs", ".json", ".css", ".html", ".md", ".prisma",
]);

// Directories to exclude
const excludeDirs = new Set([
"node_modules", ".next", ".git", "dist", "back-office/dist",
]);

async function* walk(dir) {
const entries = await fs.readdir(dir, { withFileTypes: true });
for (const entry of entries) {
const fullPath = path.join(dir, entry.name);
if (entry.isDirectory()) {
if (!excludeDirs.has(entry.name)) {
yield* walk(fullPath);
}
} else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
// Skip backup and lock files
if (entry.name.includes(".original.") || entry.name === "package-lock.json") continue;
yield fullPath;
}
}
}

// ==================== REPLACEMENT RULES ====================
// Order matters: do more specific patterns first

const brandReplacements = [
// Exact brand name replacements (first)
{ search: /PiggyStar(?![a-zA-Z])/g, replace: "PiggyStar" },
{ search: /PiggyStar(?![a-zA-Z])/g, replace: "PiggyStar" },
{ search: /PIGGYSTAR(?![a-zA-Z])/g, replace: "PIGGYSTAR" },
{ search: /PIGGYSTAR(?![a-zA-Z])/g, replace: "PIGGYSTAR" },
{ search: /PiggyStar(?![a-zA-Z])/g, replace: "PiggyStar" },
{ search: /piggyStar(?![a-zA-Z])/g, replace: "piggyStar" },
{ search: /PiggyStar/gi, replace: "PiggyStar" },
{ search: /PiggyStar/g, replace: "PIGGYSTAR" },

// Remove "" completely
{ search: //g, replace: "" },
{ search: //g, replace: "" },
{ search: //g, replace: "" },

// Leftover whitespace from removals
{ search: / +/g, replace: " " },
{ search: / \n/g, replace: "\n" },
{ search: /\n +/g, replace: "\n" },
];

// Track stats
let totalFilesProcessed = 0;
let totalFilesChanged = 0;
let totalReplacements = 0;
let changedFiles = [];

async function processFile(filePath) {
totalFilesProcessed++;
const relativePath = path.relative(rootDir, filePath);
let content;
try {
content = await fs.readFile(filePath, "utf-8");
} catch {
return; // binary file
}

let newContent = content;
let fileChanged = false;

for (const rule of brandReplacements) {
const before = newContent;
newContent = newContent.replace(rule.search, rule.replace);
if (newContent !== before) {
fileChanged = true;
const count = (before.match(rule.search) || []).length;
totalReplacements += count;
}
}

if (fileChanged) {
await fs.writeFile(filePath, newContent, "utf-8");
totalFilesChanged++;
changedFiles.push(relativePath);
console.log(` ✏️ ${relativePath}`);
}
}

async function main() {
console.log("🔍 Scanning for brand references...\n");
console.log(`Searching in: ${rootDir}\n`);

// First, find all PiggyStar/references
console.log("=== FILES WITH 'PiggyStar' references ===");
try {
const result = execSync(
`findstr /s /m /i "PiggyStar PiggyStar PIGGYSTAR ''" *.tsx *.ts *.js *.mjs *.cjs *.json *.css *.html *.md *.prisma 2>nul`,
{ cwd: rootDir, encoding: "utf-8" }
);
const files = result.split("\n").filter(Boolean);
for (const f of files) {
if (!f.includes("node_modules") && !f.includes(".next") && !f.includes("package-lock") && !f.includes(".original")) {
console.log(` ${f.trim()}`);
}
}
} catch {
console.log(" (none found via findstr)");
}

console.log("\n=== Processing files... ===\n");

// Walk through all directories
const sourceDirs = [
"src",
"public",
"scripts",
"back-office/src",
"back-office/index.html",
"back-office/package.json",
"back-office/tsconfig.json",
"back-office/vite.config.ts",
"admin-panel",
"prisma",
"tests",
];

for await (const filePath of walk(rootDir)) {
await processFile(filePath);
}

// Also process root-level files directly
const rootFiles = [
"package.json", "tsconfig.json", "next.config.mjs", "tailwind.config.ts",
"middleware.ts", ".eslintrc.json", "jest.config.cjs",
".env", "production-audit-report.md", "task-progress.md",
"prettier.config.js", "postcss.config.js",
];
for (const f of rootFiles) {
const fp = path.join(rootDir, f);
try {
await fs.access(fp);
await processFile(fp);
} catch {
// file doesn't exist, skip
}
}

console.log("\n=== Summary ===");
console.log(`Files scanned: ${totalFilesProcessed}`);
console.log(`Files modified: ${totalFilesChanged}`);
console.log(`Total replacements: ${totalReplacements}`);

console.log("\n=== Modified Files ===");
for (const f of changedFiles) {
console.log(` ${f}`);
}

console.log("\n=== Verification ===");
// Verify: search for remaining old brand names
const searchTerms = ["PiggyStar", "PiggyStar", "PIGGYSTAR", "PIGGYSTAR", "PiggyStar", ""];
let remaining = 0;
for (const term of searchTerms) {
try {
const result = execSync(
`findstr /s /m /i "${term}" *.tsx *.ts *.js *.mjs *.cjs *.json *.css *.html *.md *.prisma 2>nul`,
{ cwd: rootDir, encoding: "utf-8" }
);
const files = result.split("\n").filter(Boolean);
for (const f of files) {
if (!f.includes("node_modules") && !f.includes(".next") && !f.includes("package-lock") && !f.includes(".original")) {
console.log(` ⚠️ REMAINING '${term}' in: ${f.trim()}`);
remaining++;
}
}
} catch {
// none found
}
}

if (remaining === 0) {
console.log("✅ Zero remaining brand references found.");
} else {
console.log(`⚠️ ${remaining} remaining references need manual review.`);
}
}

main().catch(console.error);