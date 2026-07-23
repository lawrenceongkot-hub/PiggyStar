import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const extensions = new Set([
 ".tsx", ".ts", ".js", ".mjs", ".cjs", ".json", ".css", ".html", ".md", ".prisma",
]);

const excludeDirs = new Set([
 "node_modules", ".next", ".git", "dist",
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
 if (entry.name.includes(".original.") || entry.name === "package-lock.json") continue;
 yield fullPath;
 }
 }
}

async function main() {
 let total = 0;
 let changed = 0;

 for await (const filePath of walk(rootDir)) {
 let content;
 try {
 content = await fs.readFile(filePath, "utf-8");
 } catch {
 continue;
 }

 const original = content;

 // Replace ALL forms of the brand name
 // Case: "PiggyStar" (with space and apostrophe)
 content = content.replace(/PiggyStar/g, "PiggyStar");
 // Case: "PiggyStar" 
 content = content.replace(/PiggyStar/g, "PiggyStar");
 // Case: "PiggyStar"
 content = content.replace(/PiggyStar/g, "PiggyStar");
 // Case: "piggyStar"
 content = content.replace(/piggyStar/g, "piggyStar");
 // Case: "PIGGYSTAR" 
 content = content.replace(/PIGGYSTAR/g, "PIGGYSTAR");
 // Case: "PIGGYSTAR"
 content = content.replace(/PIGGYSTAR/g, "PIGGYSTAR");
 // Case: "PIGGYSTAR"
 content = content.replace(/PIGGYSTAR/g, "PIGGYSTAR");
 // Case: "piggyStar" (lowercase)
 content = content.replace(/piggyStar/g, "piggyStar");

 // Remove "" completely
 content = content.replace(//g, "");

 // Clean up double spaces and extra whitespace from removals
 content = content.replace(/ +/g, " ");

 if (content !== original) {
 await fs.writeFile(filePath, content, "utf-8");
 const relative = path.relative(rootDir, filePath);
 console.log(` ✏️ ${relative}`);
 changed++;
 total += [...original.matchAll(/PiggyStar|PiggyStar|PiggyStar|PIGGYSTAR|PIGGYSTAR|piggyStar|PIGGYSTAR|piggyStar|/g)].length;
 }
 }

 console.log(`\n✅ Second pass complete: ${changed} files modified, ~${total} replacements.`);

 // Final verification
 console.log("\n=== FINAL VERIFICATION ===");
 const terms = ["PiggyStar", "PiggyStar", "PiggyStar", "PIGGYSTAR", "PIGGYSTAR", "PIGGYSTAR", ""];
 let remaining = 0;
 
 for await (const filePath of walk(rootDir)) {
 try {
 const content = await fs.readFile(filePath, "utf-8");
 for (const term of terms) {
 if (content.includes(term)) {
 const relative = path.relative(rootDir, filePath);
 console.log(` ⚠️ '${term}' found in: ${relative}`);
 remaining++;
 }
 }
 } catch {}
 }
 
 // Also check "piggyStar" (lowercase variant not covered above)
 for await (const filePath of walk(rootDir)) {
 try {
 const content = await fs.readFile(filePath, "utf-8");
 if (content.toLowerCase().includes("piggyStar") && !content.toLowerCase().includes("piggy")) {
 const relative = path.relative(rootDir, filePath);
 // Check for false positives in actual text
 const lines = content.split("\n").filter(l => l.toLowerCase().includes("piggyStar"));
 // Only flag if it's not piggyStar
 console.log(` ⚠️ 'piggyStar' variant in: ${relative}`);
 remaining++;
 }
 } catch {}
 }

 if (remaining === 0) {
 console.log("✅ ZERO remaining brand references!");
 } else {
 console.log(`⚠️ ${remaining} remaining references (check back-office/dist is expected for built files)`);
 }
}

main().catch(console.error);