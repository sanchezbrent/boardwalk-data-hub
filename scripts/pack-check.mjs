import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const [result] = JSON.parse(execFileSync("npm", ["pack", "--json", "--ignore-scripts"], { encoding: "utf8" }));
const paths = result.files.map(f => f.path);
for (const required of ["dist/index.js", "dist/index.d.ts", "dist/ui.js", "dist/server.js", "LICENSE", "NOTICE"]) assert(paths.includes(required), `Missing ${required}`);
assert(paths.every(p => !/(node_modules|test-results|playwright-report|\.env|bootstrap-github)/.test(p)), "Unexpected private/development package content");
process.stdout.write(`Verified ${result.filename}: ${paths.length} files, ${result.size} bytes\n`);
