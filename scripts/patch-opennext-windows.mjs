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

if (!existsSync(file)) {
  console.log("patch-opennext-windows: @opennextjs/aws absent, repli ignoré.");
} else {
  let content = readFileSync(file, "utf8");
  if (content.includes("PATCH (Windows)")) {
    console.log("patch-opennext-windows: repli par copie déjà appliqué.");
  } else if (!content.includes(original)) {
    console.warn("patch-opennext-windows: version non reconnue, repli ignoré.");
  } else {
    content = content.replace(original, patched);
    writeFileSync(file, content, "utf8");
    console.log("patch-opennext-windows: repli par copie installé.");
  }
}

const cloudflareBundleFile = path.join(
  process.cwd(),
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "build",
  "bundle-server.js",
);

if (existsSync(cloudflareBundleFile)) {
  const sharpAnchor = `            "@next/env": path.join(buildOpts.outputDir, "cloudflare-templates/shims/env.js"),`;
  const sharpAlias = `            // PATCH (Windows): image optimization is disabled by the app.\n            "sharp": path.join(buildOpts.outputDir, "cloudflare-templates/shims/throw.js"),`;
  let cloudflareBundle = readFileSync(cloudflareBundleFile, "utf8");
  if (!cloudflareBundle.includes("PATCH (Windows): image optimization")) {
    if (cloudflareBundle.includes(sharpAnchor)) {
      cloudflareBundle = cloudflareBundle.replace(sharpAnchor, `${sharpAnchor}\n${sharpAlias}`);
      writeFileSync(cloudflareBundleFile, cloudflareBundle, "utf8");
      console.log("patch-opennext-windows: traitement d’images natif neutralisé.");
    } else {
      console.warn("patch-opennext-windows: point d’insertion Sharp non reconnu.");
    }
  }
}
