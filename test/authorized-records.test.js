const test = require("node:test");
const assert = require("node:assert/strict");
const { createAuthorizedClient } = require("../lib/db/authorized-records");

test("createAuthorizedClient throws when jwtToken is missing", () => {
  assert.throws(() => {
    createAuthorizedClient(null);
  }, /JWT token is required/);
});

test("authorized client supabaseRequest injects JWT bearer token and public API key", async () => {
  const calls = [];
  const client = createAuthorizedClient("my-jwt-token", {
    env: {
      SUPABASE_URL: "https://dcr.supabase.co",
      SUPABASE_PUBLIC_KEY: "my-public-key"
    },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return {
        ok: true,
        text: async () => JSON.stringify([{ id: "proj-1", project_title: "My Vocal Project" }])
      };
    }
  });

  const projects = await client.supabaseRequest("/projects", {
    method: "GET",
    query: { select: "*" }
  });

  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, "proj-1");
  assert.equal(calls.length, 1);

  const call = calls[0];
  assert.equal(call.url, "https://dcr.supabase.co/rest/v1/projects?select=*");
  assert.equal(call.options.method, "GET");
  assert.equal(call.options.headers.apikey, "my-public-key");
  assert.equal(call.options.headers.Authorization, "Bearer my-jwt-token");
  assert.equal(call.options.headers["Content-Type"], "application/json");
});

test("authorized client supabaseRequest handles errors and propagates them", async () => {
  const client = createAuthorizedClient("my-jwt-token", {
    env: {
      SUPABASE_URL: "https://dcr.supabase.co",
      SUPABASE_PUBLIC_KEY: "my-public-key"
    },
    fetchImpl: async () => {
      return {
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ message: "Row Level Security violation" })
      };
    }
  });

  await assert.rejects(async () => {
    await client.supabaseRequest("/projects");
  }, /Supabase request failed: 403 Row Level Security violation/);
});

test("authorized client helper getCustomerByEmail behaves correctly", async () => {
  const calls = [];
  const client = createAuthorizedClient("my-jwt-token", {
    env: {
      SUPABASE_URL: "https://dcr.supabase.co",
      SUPABASE_PUBLIC_KEY: "my-public-key"
    },
    fetchImpl: async (url) => {
      calls.push(String(url));
      return {
        ok: true,
        text: async () => JSON.stringify([{ id: "customer-123", email: "buyer@example.com" }])
      };
    }
  });

  const customer = await client.getCustomerByEmail("Buyer@Example.com");
  assert.ok(customer);
  assert.equal(customer.id, "customer-123");
  assert.ok(calls[0].includes("/customers?email=eq.buyer%40example.com"));
});

test("authorized client updateProject requires and applies customer scope", async () => {
  const calls = [];
  const client = createAuthorizedClient("my-jwt-token", {
    env: {
      SUPABASE_URL: "https://dcr.supabase.co",
      SUPABASE_PUBLIC_KEY: "my-public-key"
    },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return {
        ok: true,
        text: async () => JSON.stringify([{ id: "project-1", customer_id: "customer-1" }])
      };
    }
  });

  await assert.rejects(async () => {
    await client.updateProject("project-1", { status: "approved" });
  }, /Missing required field: customer id/);

  await client.updateProject(
    "project-1",
    { status: "approved" },
    { customerId: "customer-1" }
  );

  assert.ok(calls[0].url.includes("id=eq.project-1"));
  assert.ok(calls[0].url.includes("customer_id=eq.customer-1"));
  assert.equal(calls[0].options.method, "PATCH");
});

test("authorized client updateQuote requires project and customer scope", async () => {
  const calls = [];
  const client = createAuthorizedClient("my-jwt-token", {
    env: {
      SUPABASE_URL: "https://dcr.supabase.co",
      SUPABASE_PUBLIC_KEY: "my-public-key"
    },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return {
        ok: true,
        text: async () => JSON.stringify([{ id: "quote-1", project_id: "project-1", customer_id: "customer-1" }])
      };
    }
  });

  await assert.rejects(async () => {
    await client.updateQuote("quote-1", { viewed_at: "2026-05-25T00:00:00.000Z" });
  }, /Missing required field: project id/);

  await client.updateQuote(
    "quote-1",
    { viewed_at: "2026-05-25T00:00:00.000Z" },
    { projectId: "project-1", customerId: "customer-1" }
  );

  assert.ok(calls[0].url.includes("id=eq.quote-1"));
  assert.ok(calls[0].url.includes("project_id=eq.project-1"));
  assert.ok(calls[0].url.includes("customer_id=eq.customer-1"));
  assert.equal(calls[0].options.method, "PATCH");
});
