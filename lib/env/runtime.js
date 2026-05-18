const fs = require('node:fs');
const path = require('node:path');

let loaded = false;

function ensureRuntimeEnv() {
  if (loaded) return;
  loaded = true;

  if (typeof process.loadEnvFile !== 'function') return;

  loadIfPresent('.env.local');
  loadIfPresent('.env');
}

function loadIfPresent(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  try {
    process.loadEnvFile(filePath);
  } catch (_error) {
    // Let downstream runtime checks surface missing configuration normally.
  }
}

module.exports = {
  ensureRuntimeEnv,
};