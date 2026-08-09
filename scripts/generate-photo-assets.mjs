import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const sourceDir = join(root, ".assets", "uro");

const asset = {
  prefix: "hero.part",
  output: join(root, "public", "images", "uro", "uro-team-office-hq.webp"),
  bytes: 60164,
  sha256: "476600c79728f769e5832d54ec42709a5df31cb4c2830d6d69abf79c269abd15",
};

if (!existsSync(sourceDir)) {
  throw new Error(`Missing staged photo assets directory: ${sourceDir}`);
}

const parts = readdirSync(sourceDir)
  .filter((name) => name.startsWith(asset.prefix))
  .sort();

if (!parts.length) {
  throw new Error(`No asset parts found for ${asset.prefix}`);
}

const base64 = parts
  .map((name) => readFileSync(join(sourceDir, name), "utf8").trim())
  .join("");
const data = Buffer.from(base64, "base64");
const digest = createHash("sha256").update(data).digest("hex");

if (data.length !== asset.bytes || digest !== asset.sha256) {
  throw new Error(
    `Photo asset validation failed for ${asset.prefix}: got ${data.length} bytes / ${digest}`,
  );
}

mkdirSync(dirname(asset.output), { recursive: true });
writeFileSync(asset.output, data);
console.log(`Generated ${asset.output.replace(`${root}/`, "")} (${data.length} bytes)`);
