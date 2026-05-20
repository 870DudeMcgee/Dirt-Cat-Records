function getSupabaseAdminConfig(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    supabaseKey,
  };
}

async function ensureConfirmedAuthUser(email, options = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("A valid customer email is required.");
  }

  const { supabaseUrl, supabaseKey } = getSupabaseAdminConfig(options.env);
  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizedEmail,
      email_confirm: true,
    }),
  });
  const body = await parseResponseBody(response);

  if (response.ok) {
    return {
      status: "created",
      userId: body?.id || null,
      email: body?.email || normalizedEmail,
    };
  }

  if (isAlreadyRegisteredError(body)) {
    return {
      status: "existing",
      userId: body?.id || null,
      email: normalizedEmail,
    };
  }

  throw new Error(
    `Supabase admin user provisioning failed: ${response.status} ${extractErrorMessage(body)}`
  );
}

async function parseResponseBody(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return { message: raw };
  }
}

function extractErrorMessage(body) {
  if (!body || typeof body !== "object") return "Unknown error";
  return (
    body.msg ||
    body.message ||
    body.error_description ||
    body.error ||
    JSON.stringify(body)
  );
}

function isAlreadyRegisteredError(body) {
  const message = extractErrorMessage(body);
  return /already\s+(been\s+)?registered|already\s+exists|user\s+already\s+registered/i.test(
    message
  );
}

function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

module.exports = {
  ensureConfirmedAuthUser,
  getSupabaseAdminConfig,
  normalizeEmail,
};
