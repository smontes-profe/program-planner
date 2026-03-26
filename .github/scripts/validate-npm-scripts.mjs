import fs from "node:fs";

const REQUIRED_SCRIPTS = ["lint", "typecheck", "test", "test:a11y", "test:responsive"];

const packageJsonPath = new URL("../../package.json", import.meta.url);

if (!fs.existsSync(packageJsonPath)) {
  console.log("No package.json found. Skipping script validation.");
  process.exit(0);
}

const packageJsonRaw = fs.readFileSync(packageJsonPath, "utf8");
const packageJson = JSON.parse(packageJsonRaw);
const scripts = packageJson.scripts ?? {};

const missing = REQUIRED_SCRIPTS.filter((scriptName) => !scripts[scriptName]);

if (missing.length > 0) {
  console.error("Missing required npm scripts:");
  for (const scriptName of missing) {
    console.error(`- ${scriptName}`);
  }
  console.error("Add them to package.json before merging.");
  process.exit(1);
}

console.log("All required npm scripts are present.");
