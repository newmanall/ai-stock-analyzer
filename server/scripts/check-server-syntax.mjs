import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const serverRoot = fileURLToPath(new URL("..", import.meta.url));
const skippedDirs = new Set(["public", "node_modules"]);

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) {
        files.push(...await collectJsFiles(fullPath));
      }
      continue;
    }

    if (entry.isFile() && /\.(m?js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await collectJsFiles(serverRoot);
const failed = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    failed.push({ file, output: result.stderr || result.stdout });
  }
}

if (failed.length > 0) {
  for (const failure of failed) {
    console.error(`\n${relative(serverRoot, failure.file)}`);
    console.error(failure.output.trim());
  }
  process.exit(1);
}

console.log(`Checked ${files.length} server JS/MJS files.`);
