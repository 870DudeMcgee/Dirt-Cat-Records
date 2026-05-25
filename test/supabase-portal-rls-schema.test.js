const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schema = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "schema.sql"),
  "utf8"
);

test("schema grants authenticated users portal-scoped table access", () => {
  for (const table of [
    "customers",
    "projects",
    "project_files",
    "quotes",
    "quote_line_items",
    "project_events",
    "revision_requests",
  ]) {
    assert.match(
      schema,
      new RegExp(`grant [^;]+ on (?:table )?public\\.${table} to authenticated`, "i"),
      `${table} should grant scoped authenticated access`
    );
  }
});

test("schema defines customer-owned RLS policies for portal tables", () => {
  for (const policy of [
    "customers_select_own",
    "projects_select_own",
    "projects_update_own",
    "project_files_insert_own",
    "quotes_select_own",
    "quotes_update_own",
    "quote_line_items_select_own",
    "project_events_insert_own",
    "revision_requests_insert_own",
  ]) {
    assert.match(schema, new RegExp(`create policy ${policy}`, "i"));
  }
});