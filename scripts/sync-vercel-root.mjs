import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "artifacts", "dash");

const copies = [
  ["package.json", "package.json"],
  ["package-lock.json", "package-lock.json"],
  ["index.html", "index.html"],
  ["vite.config.ts", "vite.config.ts"],
  ["tsconfig.json", "tsconfig.json"],
  ["vercel.json", "vercel.json"],
  ["src", "src"],
  ["public", "public"],
];

mkdirSync(target, { recursive: true });
for (const [from, to] of copies) {
  const src = join(root, from);
  const dest = join(target, to);
  if (!existsSync(src)) throw new Error(`Missing ${src}`);
  cpSync(src, dest, { recursive: true });
}

console.log("Synced dashboard source to artifacts/dash");