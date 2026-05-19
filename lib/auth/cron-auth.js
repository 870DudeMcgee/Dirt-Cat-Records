function getCronToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (match && match[1]) return match[1];

  const headerToken =
    headers["x-cron-secret"] || headers["X-Cron-Secret"] || "";
  return headerToken || null;
}

function requireCronAuth(req, env = process.env) {
  const configuredSecret = env.CRON_SECRET;
  if (!configuredSecret) {
    const error = new Error("Cron route is not configured.");
    error.statusCode = 500;
    throw error;
  }

  const providedToken = getCronToken(req?.headers || {});
  if (!providedToken || providedToken !== configuredSecret) {
    const error = new Error("Cron access required.");
    error.statusCode = 401;
    throw error;
  }

  return true;
}

module.exports = {
  getCronToken,
  requireCronAuth,
};
