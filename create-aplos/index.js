#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = path.resolve(__dirname, "templates/minimal");
const VALID_NAME = /^[a-z0-9][a-z0-9._-]*$/i;

const projectName = process.argv[2];

if (!projectName) {
  console.error("Usage: create-aplos <project-name>");
  console.error("       bun create aplos <project-name>");
  console.error("       npm create aplos <project-name>");
  process.exit(1);
}

if (!VALID_NAME.test(projectName) || projectName.startsWith(".")) {
  console.error(
    `Invalid project name: "${projectName}". Use letters, digits, dashes, dots or underscores.`
  );
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), projectName);

if (fs.existsSync(targetDir)) {
  const entries = fs.readdirSync(targetDir);
  if (entries.length > 0) {
    console.error(
      `Target directory "${projectName}" already exists and is not empty.`
    );
    process.exit(1);
  }
} else {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log(`Creating Aplos project in ${targetDir}...`);

copyDirectory(TEMPLATE_DIR, targetDir, projectName);
renameGitignore(targetDir);

console.log("");
console.log("Done. Next steps:");
console.log("");
console.log(`  cd ${projectName}`);
console.log("  bun install");
console.log("  bun dev");
console.log("");
console.log("Happy hacking!");

function copyDirectory(src, dest, name) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirectory(srcPath, destPath, name);
    } else if (entry.isFile()) {
      copyFile(srcPath, destPath, name);
    }
  }
}

function copyFile(src, dest, name) {
  if (isBinary(src)) {
    fs.copyFileSync(src, dest);
    return;
  }

  const content = fs.readFileSync(src, "utf8");
  const replaced = content.replace(/\{\{NAME\}\}/g, name);
  fs.writeFileSync(dest, replaced);
}

function isBinary(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".woff", ".woff2"].includes(
    ext
  );
}

function renameGitignore(dir) {
  const stub = path.join(dir, "_gitignore");
  const real = path.join(dir, ".gitignore");
  if (fs.existsSync(stub) && !fs.existsSync(real)) {
    fs.renameSync(stub, real);
  }
}
