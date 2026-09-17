import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const standaloneRoot = join(".next", "standalone");

if (!existsSync(standaloneRoot)) {
  process.exit(0);
}

const standaloneNext = join(standaloneRoot, ".next");
mkdirSync(standaloneNext, { recursive: true });

if (existsSync(join(".next", "static"))) {
  cpSync(join(".next", "static"), join(standaloneNext, "static"), {
    recursive: true,
    force: true,
  });
}

if (existsSync("public")) {
  cpSync("public", join(standaloneRoot, "public"), {
    recursive: true,
    force: true,
  });
}
