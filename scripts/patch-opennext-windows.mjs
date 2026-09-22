/**
 * OpenNext creates symlinks while copying traced packages. Windows blocks
 * those links unless Developer Mode or elevated privileges are enabled.
 * Install an idempotent recursive-copy fallback for local builds only.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "node_modules",
  "@opennextjs",
  "aws",
  "dist",
  "build",
  "copyTracedFiles.js",
);

if (!existsSync(file)) {
  console.log("patch-opennext-windows: @opennextjs/aws absent, rien à faire.");
  process.exit(0);
}

const original = `        if (symlink) {
            try {
                symlinkSync(symlink, to);
            }
            catch (e) {
                if (e.code !== "EEXIST") {
                    throw e;
                }
            }
        }`;

const patched = `        if (symlink) {
            try {
                symlinkSync(symlink, to);
            }
            catch (e) {
                if (e.code !== "EEXIST") {
                    // PATCH (Windows): copy the resolved target when symlink
                    // creation is unavailable in the current environment.
                    const resolved = path.resolve(path.dirname(from), symlink);
                    if (existsSync(resolved)) {
                        const stat = statSync(resolved);
                        if (stat.isDirectory()) {
                            cpSync(resolved, to, { recursive: true, force: true, dereference: true });
                        }
                        else {
                            copyFileSync(resolved, to);
                        }
                    }
                    else {
                        throw e;
                    }
                }
            }
        }`;

let content = readFileSync(file, "utf8");
if (content.includes("PATCH (Windows)")) {
  console.log("patch-opennext-windows: déjà appliqué.");
  process.exit(0);
}
if (!content.includes(original)) {
  console.warn("patch-opennext-windows: version non reconnue, patch ignoré.");
  process.exit(0);
}

content = content.replace(original, patched);
writeFileSync(file, content, "utf8");
console.log("patch-opennext-windows: repli par copie installé.");
