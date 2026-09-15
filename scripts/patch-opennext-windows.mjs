/**
 * Patch Windows pour @opennextjs/aws : `copyTracedFiles` crée des symlinks
 * (interdits sur Windows sans mode développeur / droits admin) pour les
 * paquets npm exposés en junctions. Ce script installe un repli par copie
 * récursive — idempotent, sans effet si le patch est déjà présent.
 *
 * Exécuté automatiquement via `postinstall`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let file;
try {
  file = require.resolve("@opennextjs/aws/dist/build/copyTracedFiles.js");
} catch {
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
                    // PATCH (Windows): la création de symlinks requiert le mode
                    // développeur ou des droits admin. Repli : copie récursive
                    // de la cible résolue (junction npm) vers la destination.
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
  console.warn(
    "patch-opennext-windows: motif introuvable (version @opennextjs/aws différente ?) — patch ignoré."
  );
  process.exit(0);
}

content = content.replace(original, patched);
writeFileSync(file, content, "utf8");
console.log("patch-opennext-windows: repli copie récursive installé");
