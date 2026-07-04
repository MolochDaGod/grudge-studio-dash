import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dashRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const harborIndex = join(dashRoot, "..", "grudge-fleet", "harbor", "public", "index.html");
const dashDist = join(dashRoot, "dist", "index.html");

mkdirSync(dirname(dashDist), { recursive: true });
copyFileSync(harborIndex, dashDist);
console.log("Synced harbor map → grudge-studio-dash/dist/index.html");