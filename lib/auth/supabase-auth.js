function getBearerToken(headers = {}) {
  const value = headers.authorization || headers.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match ? match[1] : null;
}

function isAdminEmail(email, env = process.env) {
  return Boolean(email && env.ADMIN_EMAIL && email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase());
}

async function getSupabaseUser(accessToken, options = {}) {
  if (!accessToken) return null;
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLIC_KEY) throw new Error('Supabase public auth is not configured.');
  const response = await fetchImpl(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLIC_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function requireUser(req, options = {}) {
  const token = getBearerToken(req.headers || {});
  const user = await getSupabaseUser(token, options);
  if (!user?.email) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }
  return user;
}

async function requireAdmin(req, options = {}) {
  const user = await requireUser(req, options);
  if (!isAdminEmail(user.email, options.env || process.env)) {
    const error = new Error('Admin access required.');
    error.statusCode = 403;
    throw error;
  }
  return user;
}

module.exports = {
  getBearerToken,
  getSupabaseUser,
  isAdminEmail,
  requireAdmin,
  requireUser,
};
