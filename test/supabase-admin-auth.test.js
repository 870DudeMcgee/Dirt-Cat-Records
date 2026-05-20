const test = require("node:test");
const assert = require("node:assert/strict");
const { ensureConfirmedAuthUser } = require("../lib/auth/supabase-admin");

test("ensureConfirmedAuthUser creates a confirmed auth user", async () => {
  let request = null;
  const result = await ensureConfirmedAuthUser(" Buyer@Example.com ", {
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    },
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return createResponse(200, {
        id: "auth-user-1",
        email: "buyer@example.com",
      });
    },
  });

  assert.equal(result.status, "created");
  assert.equal(result.userId, "auth-user-1");
  assert.equal(request.url, "https://project.supabase.co/auth/v1/admin/users");
  assert.deepEqual(JSON.parse(request.options.body), {
    email: "buyer@example.com",
    email_confirm: true,
  });
});

test("ensureConfirmedAuthUser treats already-registered users as existing", async () => {
  const result = await ensureConfirmedAuthUser("buyer@example.com", {
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    },
    fetchImpl: async () =>
      createResponse(422, {
        msg: "A user with this email address has already been registered",
      }),
  });

  assert.equal(result.status, "existing");
  assert.equal(result.email, "buyer@example.com");
});

test("ensureConfirmedAuthUser throws for unexpected provisioning failures", async () => {
  await assert.rejects(
    () =>
      ensureConfirmedAuthUser("buyer@example.com", {
        env: {
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-key",
        },
        fetchImpl: async () =>
          createResponse(500, {
            message: "database is unavailable",
          }),
      }),
    /Supabase admin user provisioning failed: 500 database is unavailable/
  );
});

function createResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body);
    },
  };
}
