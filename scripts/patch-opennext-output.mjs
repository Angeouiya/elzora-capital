import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const serverFunctionsDir = path.join(process.cwd(), ".open-next", "server-functions");

if (!existsSync(serverFunctionsDir)) {
  throw new Error("patch-opennext-output: dossier .open-next/server-functions introuvable.");
}

const handlers = readdirSync(serverFunctionsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(serverFunctionsDir, entry.name, "handler.mjs"))
  .filter(existsSync);

const dynamicMiddlewareManifest =
  "getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}";
const disabledMiddlewareManifest = "getMiddlewareManifest(){return null}";

let patched = 0;

for (const handler of handlers) {
  const content = readFileSync(handler, "utf8");
  const matches = content.split(dynamicMiddlewareManifest).length - 1;

  if (matches > 1) {
    throw new Error(
      `patch-opennext-output: ${matches} appels inattendus au manifeste dans ${handler}.`,
    );
  }

  if (matches === 1) {
    writeFileSync(handler, content.replace(dynamicMiddlewareManifest, disabledMiddlewareManifest));
    patched += 1;
  }
}

if (patched > 0) {
  console.log(
    `patch-opennext-output: ${patched} manifeste middleware neutralisé (aucun middleware applicatif).`,
  );
} else if (
  handlers.length > 0 &&
  handlers.every((handler) => readFileSync(handler, "utf8").includes(disabledMiddlewareManifest))
) {
  console.log("patch-opennext-output: correctif déjà appliqué.");
} else {
  throw new Error("patch-opennext-output: signature OpenNext non reconnue.");
}
