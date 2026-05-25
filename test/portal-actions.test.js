const test = require("node:test");
const assert = require("node:assert/strict");
const { createPortalActionsHandler } = require("../lib/api/portal/actions");

test("portal file link endpoint rejects unauthenticated requests", async () => {
  const handler = createPortalActionsHandler({
    requireUserImpl: async () => {
      const error = new Error("Authentication required.");
      error.statusCode = 401;
      throw error;
    },
  });
  const res = response();
  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/portal/actions?action=file-links",
      body: "{}",
    },
    res
  );
  assert.equal(res.statusCode, 401);
});

test("portal file link endpoint stores external links for owned project", async () => {
  const calls = [];
  const handler = createPortalActionsHandler({
    requireUserImpl: async () => ({ email: "buyer@example.com" }),
    records: {
      getCustomerByEmail: async () => ({
        id: "customer-1",
        email: "buyer@example.com",
      }),
      getProjectForCustomer: async () => ({ id: "project-1", order_id: null }),
      createProjectFile: async (input) => {
        calls.push({ type: "file", input });
        return { id: "file-1" };
      },
      updateProject: async (projectId, patch) => {
        calls.push({ type: "project", projectId, patch });
      },
      createProjectEvent: async (event) => {
        calls.push({ type: "event", event });
      },
      createEmailEvent: async (event) => {
        calls.push({ type: "email", event });
      },
    },
    sendEmail: async () => ({ id: "email-1" }),
  });

  const res = response();
  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/portal/actions?action=file-links",
      body: JSON.stringify({
        projectId: "project-1",
        url: "https://drive.test/song",
      }),
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(
    calls.find((call) => call.type === "file").input.uploadLink,
    "https://drive.test/song"
  );
  assert.equal(
    calls.find((call) => call.type === "project").patch.status,
    "files_submitted"
  );
  assert.equal(
    calls.find((call) => call.type === "email").event.status,
    "sent"
  );
});

test("portal projects endpoint requests fields needed by the customer portal", async () => {
  const calls = [];
  const handler = createPortalActionsHandler({
    requireUserImpl: async () => ({ email: "buyer@example.com" }),
    records: {
      normalizeEmail: (email) => email.toLowerCase(),
      supabaseRequest: async (path, options) => {
        calls.push({ path, options });
        if (path === "/customers")
          return [{ id: "customer-1", email: "buyer@example.com" }];
        if (path === "/projects")
          return [{ id: "project-1", active_quote_id: "quote-1" }];
        if (path === "/quotes")
          return [
            {
              id: "quote-1",
              customer_id: "customer-1",
              status: "sent",
              final_total_cents: 45000,
            },
          ];
        if (path === "/quote_line_items")
          return [
            {
              id: "line-item-1",
              quote_id: "quote-1",
              label: "Custom Project Deposit",
            },
          ];
        return [];
      },
    },
  });

  const res = response();
  await handler(
    { method: "GET", headers: {}, url: "/api/portal/actions?action=projects" },
    res
  );

  assert.equal(res.statusCode, 200);
  const projectSelect = calls.find((call) => call.path === "/projects").options
    .query.select;
  assert.match(projectSelect, /included_revisions/);
  assert.match(projectSelect, /used_revisions/);
  assert.match(projectSelect, /extra_revisions_allowed/);
  assert.match(projectSelect, /active_quote_id/);
  assert.match(projectSelect, /balance_due/);
  assert.match(projectSelect, /amount_paid/);
  assert.ok(calls.some((call) => call.path === "/quotes"));
  assert.ok(calls.some((call) => call.path === "/quote_line_items"));
});

test("portal projects endpoint uses authorized records by default", async () => {
  const calls = [];
  const handler = createPortalActionsHandler({
    requireUserImpl: async () => ({ email: "buyer@example.com" }),
    env: {
      SUPABASE_URL: "https://scoped.supabase.co",
      SUPABASE_PUBLIC_KEY: "public-key",
    },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("/customers")) {
        return jsonResponse([{ id: "customer-1", email: "buyer@example.com" }]);
      }
      if (String(url).includes("/projects")) {
        return jsonResponse([{ id: "project-1", active_quote_id: null }]);
      }
      return jsonResponse([]);
    },
  });

  const res = response();
  await handler(
    {
      method: "GET",
      headers: { authorization: "Bearer customer-jwt" },
      url: "/api/portal/actions?action=projects",
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.ok(calls.every((call) => call.url.startsWith("https://scoped.supabase.co/rest/v1/")));
  assert.ok(calls.every((call) => call.options.headers.apikey === "public-key"));
  assert.ok(calls.every((call) => call.options.headers.Authorization === "Bearer customer-jwt"));
});

test("revision endpoint sends and logs admin notification", async () => {
  const calls = [];
  const handler = createPortalActionsHandler({
    requireUserImpl: async () => ({ email: "buyer@example.com" }),
    env: { ADMIN_EMAIL: "josh@example.com" },
    sendEmail: async (message) => {
      calls.push({ type: "send", message });
      return { id: "email-1" };
    },
    records: portalRecords(calls, {
      status: "delivered",
      included_revisions: 1,
      used_revisions: 0,
    }),
  });

  const res = response();
  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/portal/actions?action=revisions",
      body: JSON.stringify({
        projectId: "project-1",
        notes: "Bring the vocal up.",
      }),
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(
    calls.find((call) => call.type === "send").message.to,
    "josh@example.com"
  );
  assert.equal(
    calls.find((call) => call.type === "email").event.status,
    "sent"
  );
});

test("approval endpoint sends and logs admin notification", async () => {
  const calls = [];
  const handler = createPortalActionsHandler({
    requireUserImpl: async () => ({ email: "buyer@example.com" }),
    env: { ADMIN_EMAIL: "josh@example.com" },
    sendEmail: async (message) => {
      calls.push({ type: "send", message });
      return { id: "email-1" };
    },
    records: portalRecords(calls, {
      status: "delivered",
      final_delivery_url: "https://drive.test/final",
      final_delivery_locked: false,
    }),
  });

  const res = response();
  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/portal/actions?action=approvals",
      body: JSON.stringify({ projectId: "project-1" }),
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(
    calls.find((call) => call.type === "send").message.to,
    "josh@example.com"
  );
  assert.equal(
    calls.find((call) => call.type === "email").event.status,
    "sent"
  );
});

test("approval endpoint rejects locked final delivery through policy reason", async () => {
  const calls = [];
  const handler = createPortalActionsHandler({
    requireUserImpl: async () => ({ email: "buyer@example.com" }),
    env: { ADMIN_EMAIL: "josh@example.com" },
    sendEmail: async () => {
      throw new Error("sendEmail should not run");
    },
    records: portalRecords(calls, {
      status: "delivered",
      final_delivery_url: "https://drive.test/final",
      final_delivery_locked: true,
    }),
  });

  const res = response();
  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/portal/actions?action=approvals",
      body: JSON.stringify({ projectId: "project-1" }),
    },
    res
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.reason, "final_delivery_not_ready");
  assert.equal(
    calls.some((call) => call.type === "project"),
    false
  );
});

function portalRecords(calls, projectPatch = {}) {
  return {
    getCustomerByEmail: async () => ({
      id: "customer-1",
      email: "buyer@example.com",
    }),
    getProjectForCustomer: async () => ({
      id: "project-1",
      project_code: "DCR-000123",
      order_id: null,
      included_revisions: 1,
      used_revisions: 0,
      extra_revisions_allowed: 0,
      status: "delivered",
      final_delivery_locked: false,
      ...projectPatch,
    }),
    createRevisionRequest: async () => ({ id: "revision-1" }),
    updateProject: async (projectId, patch) => {
      calls.push({ type: "project", projectId, patch });
      return { id: projectId, ...patch };
    },
    createProjectEvent: async (event) => {
      calls.push({ type: "event", event });
    },
    createEmailEvent: async (event) => {
      calls.push({ type: "email", event });
    },
  };
}

function response() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function jsonResponse(body) {
  return {
    ok: true,
    text: async () => JSON.stringify(body),
  };
}
