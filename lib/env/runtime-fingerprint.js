function buildRuntimeFingerprint(env = process.env) {
  return {
    siteUrl: summarizeUrl(env.SITE_URL),
    paypalEnv: env.PAYPAL_ENV || null,
    paypalClientId: summarizeOpaqueValue(env.PAYPAL_CLIENT_ID),
    paypalWebhookId: summarizeOpaqueValue(env.PAYPAL_WEBHOOK_ID),
    supabaseUrl: summarizeUrl(env.SUPABASE_URL),
    supabaseProjectRef: extractSupabaseProjectRef(env.SUPABASE_URL),
    resendFrom: summarizeEmailValue(env.RESEND_FROM_EMAIL),
    resendReplyTo: summarizeEmailValue(
      env.RESEND_REPLY_TO_EMAIL || env.ADMIN_EMAIL
    ),
    adminEmail: summarizeEmailValue(env.ADMIN_EMAIL),
    googleDriveProjectsFolderId: summarizeOpaqueValue(
      env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID
    ),
  };
}

function formatRuntimeFingerprint(fingerprint) {
  const lines = [];

  lines.push(`SITE_URL: ${formatUrlSummary(fingerprint.siteUrl)}`);
  lines.push(`PAYPAL_ENV: ${fingerprint.paypalEnv || "missing"}`);
  lines.push(
    `PAYPAL_CLIENT_ID: ${formatOpaqueSummary(fingerprint.paypalClientId)}`
  );
  lines.push(
    `PAYPAL_WEBHOOK_ID: ${formatOpaqueSummary(fingerprint.paypalWebhookId)}`
  );
  lines.push(`SUPABASE_URL: ${formatUrlSummary(fingerprint.supabaseUrl)}`);
  lines.push(
    `SUPABASE_PROJECT_REF: ${fingerprint.supabaseProjectRef || "missing"}`
  );
  lines.push(
    `RESEND_FROM_EMAIL: ${formatEmailSummary(fingerprint.resendFrom)}`
  );
  lines.push(
    `RESEND_REPLY_TO_EMAIL: ${formatEmailSummary(fingerprint.resendReplyTo)}`
  );
  lines.push(`ADMIN_EMAIL: ${formatEmailSummary(fingerprint.adminEmail)}`);
  lines.push(
    `GOOGLE_DRIVE_PROJECTS_FOLDER_ID: ${formatOpaqueSummary(
      fingerprint.googleDriveProjectsFolderId
    )}`
  );

  return lines;
}

function summarizeOpaqueValue(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return { present: false };

  return {
    present: true,
    prefix: normalized.slice(0, 4),
    suffix: normalized.slice(-4),
    length: normalized.length,
  };
}

function summarizeUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return { present: false };

  try {
    const parsed = new URL(normalized);
    return {
      present: true,
      origin: parsed.origin,
      host: parsed.host,
      protocol: parsed.protocol.replace(/:$/, ""),
    };
  } catch (_error) {
    return { present: true, raw: normalized };
  }
}

function summarizeEmailValue(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return { present: false };

  const address = extractEmailAddress(normalized);
  if (!address) {
    return { present: true, masked: maskLooseValue(normalized), domain: null };
  }

  return {
    present: true,
    masked: maskEmail(address),
    domain: address.split("@")[1] || null,
  };
}

function extractSupabaseProjectRef(value) {
  const summary = summarizeUrl(value);
  if (!summary.present || !summary.host) return null;
  const match = summary.host.match(/^([^.]+)\.supabase\.co$/i);
  return match ? match[1] : null;
}

function extractEmailAddress(value) {
  const match = value.match(/<([^>]+)>/);
  const address = (match ? match[1] : value).trim().toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) return null;
  return address;
}

function maskEmail(address) {
  const [localPart, domain] = address.split("@");
  const first = localPart.slice(0, 1) || "*";
  return `${first}***@${domain}`;
}

function maskLooseValue(value) {
  if (value.length <= 4) return `${value.slice(0, 1)}***`;
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function formatOpaqueSummary(summary) {
  if (!summary?.present) return "missing";
  return `${summary.prefix}...${summary.suffix} (len ${summary.length})`;
}

function formatUrlSummary(summary) {
  if (!summary?.present) return "missing";
  if (summary.origin) return `${summary.origin} (${summary.host})`;
  return summary.raw;
}

function formatEmailSummary(summary) {
  if (!summary?.present) return "missing";
  return summary.domain
    ? `${summary.masked} (${summary.domain})`
    : summary.masked;
}

module.exports = {
  buildRuntimeFingerprint,
  formatRuntimeFingerprint,
};
