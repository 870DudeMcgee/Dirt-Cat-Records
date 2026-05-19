const fs = require("node:fs");
const path = require("node:path");

const HOBBY_FUNCTION_LIMIT = 12;

const apiDir = path.join(process.cwd(), "api");
const functionFiles = listFunctionFiles(apiDir);

if (functionFiles.length > HOBBY_FUNCTION_LIMIT) {
  console.error(
    `Vercel Hobby plan allows at most ${HOBBY_FUNCTION_LIMIT} Serverless Functions.`
  );
  console.error(
    `This repo currently has ${functionFiles.length} deployable functions under /api.`
  );
  console.error("Merge routes or upgrade the Vercel plan before deploying.");
  console.error("Functions:");
  functionFiles.forEach((file) =>
    console.error(`- ${path.relative(process.cwd(), file)}`)
  );
  process.exit(1);
}

console.log(
  `Vercel function count OK: ${functionFiles.length}/${HOBBY_FUNCTION_LIMIT}`
);

function listFunctionFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFunctionFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}
