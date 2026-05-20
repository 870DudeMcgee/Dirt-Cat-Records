function getPublicAppOrigin(env = process.env) {
  return getVercelDeploymentOrigin(env) || normalizeOrigin(env.SITE_URL) || "";
}

function getVercelDeploymentOrigin(env = process.env) {
  if (String(env.VERCEL_ENV || "").toLowerCase() !== "preview") return "";

  return normalizeHostOrigin(env.VERCEL_URL) || "";
}

function normalizeOrigin(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.origin;
  } catch (_error) {
    return "";
  }
}

function normalizeHostOrigin(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  if (/^https?:\/\//i.test(normalized)) {
    return normalizeOrigin(normalized);
  }

  const host = normalized.replace(/^\/+|\/+$/g, "").split("/")[0];
  if (!host) return "";
  return `https://${host}`;
}

module.exports = {
  getPublicAppOrigin,
  getVercelDeploymentOrigin,
  normalizeOrigin,
  normalizeHostOrigin,
};
