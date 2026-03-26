#!/usr/bin/env node
// Pre-build script: removes internal-only views from the source tree
// so they are not compiled into the production bundle.
//
// Usage: node strip-internal.cjs
//   Run before `vite build` in CI. Does nothing if internal-views.json is missing.

const fs = require("fs");
const path = require("path");

const root = __dirname;
const configPath = path.join(root, "internal-views.json");

if (!fs.existsSync(configPath)) {
  console.log("[strip-internal] No internal-views.json found, skipping.");
  process.exit(0);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const files = config.exclude || [];
const registryKeys = config.registryKeys || [];

// 1. Delete the view files
for (const file of files) {
  const filePath = path.join(root, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[strip-internal] Deleted ${file}`);
  }
}

// 2. Remove entries from COMPONENT_MAP in registry.ts
const registryPath = path.join(root, "src/views/registry.ts");
if (fs.existsSync(registryPath)) {
  let content = fs.readFileSync(registryPath, "utf-8");
  for (const key of registryKeys) {
    // Remove the line containing this key and its import
    const pattern = new RegExp(`\\s*"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}":.*\\n`, "g");
    content = content.replace(pattern, "\n");
  }
  fs.writeFileSync(registryPath, content);
  console.log(`[strip-internal] Cleaned registry.ts (removed ${registryKeys.length} keys)`);
}

console.log("[strip-internal] Done.");
