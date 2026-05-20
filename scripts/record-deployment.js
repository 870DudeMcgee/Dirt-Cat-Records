const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function normalizeCell(value) {
  return (
    String(value || "-")
      .replace(/\r?\n|\r/g, " ")
      .replace(/\|/g, "\\|")
      .trim() || "-"
  );
}

function usage(message) {
  if (message) {
    console.error(message);
    console.error("");
  }

  console.error(
    "Usage: npm run record:deployment -- --env <preview|production> --url <deployment-url> --alias <alias-or-none> --purpose <test-purpose> --verifier <name>"
  );
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  usage();
}

const required = ["env", "url", "alias", "purpose", "verifier"];
const missing = required.filter((key) => !args[key]);

if (missing.length > 0) {
  usage(`Missing required arguments: ${missing.join(", ")}`);
}

const repoRoot = runGit(["rev-parse", "--show-toplevel"]);
const ledgerPath = path.join(repoRoot, "docs", "deployment-ledger.md");

if (!fs.existsSync(ledgerPath)) {
  usage(`Deployment ledger not found at ${ledgerPath}`);
}

const branch = args.branch || runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
const sha = args.sha || runGit(["rev-parse", "HEAD"]);
const worktree =
  args.clean ||
  (runGit(["status", "--porcelain"]).length === 0 ? "clean" : "dirty");
const row = `| ${normalizeCell(new Date().toISOString())} | ${normalizeCell(args.env)} | ${normalizeCell(branch)} | ${normalizeCell(sha)} | ${normalizeCell(worktree)} | ${normalizeCell(args.url)} | ${normalizeCell(args.alias)} | ${normalizeCell(args.purpose)} | ${normalizeCell(args.verifier)} |\n`;

const ledgerPrefix = fs.readFileSync(ledgerPath, "utf8").endsWith("\n")
  ? ""
  : "\n";

fs.appendFileSync(ledgerPath, `${ledgerPrefix}${row}`, "utf8");
process.stdout.write(`Appended deployment ledger entry to ${ledgerPath}\n`);
