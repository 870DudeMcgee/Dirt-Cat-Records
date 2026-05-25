const { ensureRuntimeEnv } = require("../../env/runtime");
const {
  methodNotAllowed,
  readJsonBody,
  sendJson,
} = require("../../http/json");
const { normalizeEmail } = require("../../db/studio-records");
const { sendStudioEmail } = require("../../email/resend");

ensureRuntimeEnv();

const DEFAULT_RATE_LIMIT_MS = 15 * 60 * 1000;
const DEFAULT_RATE_STORE = new Map();
const MAX_SHORT_TEXT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 2000;
const ISSUE_TYPE_LABELS = {
  portal_access: "Portal access or magic link",
  upload_help: "Uploads or file delivery",
  project_status: "Project question or status update",
  payment_receipt: "Payment receipt or checkout question",
  other: "Other",
};

function createProjectSupportHandler(dependencies = {}) {
  const sendEmail = dependencies.sendEmail || sendStudioEmail;
  const rateStore = dependencies.rateStore || DEFAULT_RATE_STORE;
  const now = dependencies.now || (() => Date.now());
  const rateLimitMs = dependencies.rateLimitMs || DEFAULT_RATE_LIMIT_MS;
  const env = dependencies.env || process.env;

  return async function projectSupportHandler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 400, {
        error: error.publicMessage || "Invalid request",
      });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return sendJson(res, 400, { error: "Invalid request payload." });
    }
    if (typeof body.website === "string" && body.website.trim()) {
      return sendJson(res, 400, { error: "Invalid request payload." });
    }

    const email = normalizeEmail(body.email);
    const issueType = normalizeIssueType(body.issueType);
    const message = sanitizeText(body.message, MAX_MESSAGE_LENGTH);
    if (!email)
      return sendJson(res, 400, { error: "A valid email is required." });
    if (!issueType)
      return sendJson(res, 400, {
        error: "Choose the type of support you need.",
      });
    if (!message)
      return sendJson(res, 400, { error: "A short message is required." });
    if (isRateLimited({ req, email, rateStore, now: now(), rateLimitMs })) {
      return sendJson(res, 429, {
        error: "Please wait before sending another support request.",
      });
    }

    try {
      await sendSupportRequest(
        {
          email,
          name: sanitizeText(body.name, MAX_SHORT_TEXT_LENGTH),
          projectName: sanitizeText(body.projectName, MAX_SHORT_TEXT_LENGTH),
          issueType,
          message,
          paypalOrderId: sanitizeText(
            body.paypalOrderId,
            MAX_SHORT_TEXT_LENGTH
          ),
          serviceLabel: sanitizeText(body.serviceLabel, MAX_SHORT_TEXT_LENGTH),
          amountPaidLabel: sanitizeText(
            body.amountPaidLabel,
            MAX_SHORT_TEXT_LENGTH
          ),
          paymentMode: sanitizeText(body.paymentMode, MAX_SHORT_TEXT_LENGTH),
        },
        { env, sendEmail }
      );

      return sendJson(res, 200, { ok: true });
    } catch (error) {
      console.error("Project support submission failed:", {
        message: error.message,
      });
      return sendJson(res, 500, { error: "Project support request failed." });
    }
  };
}

async function sendSupportRequest(input, dependencies = {}) {
  const env = dependencies.env || process.env;
  const sendEmail = dependencies.sendEmail || sendStudioEmail;
  const adminEmail = normalizeEmail(env.ADMIN_EMAIL);
  if (!adminEmail) {
    throw new Error("Project support email is not configured.");
  }

  return sendEmail({
    to: adminEmail,
    emailType: "admin_notification",
    data: {
      subject: buildSupportSubject(input),
      text: buildSupportText(input),
    },
  });
}

function buildSupportSubject(input) {
  const label = ISSUE_TYPE_LABELS[input.issueType] || "Project support";
  const descriptor = input.projectName || input.name || input.email;
  return `Project support: ${label}${descriptor ? ` - ${descriptor}` : ""}`;
}

function buildSupportText(input) {
  const lines = [
    "A paid-customer support request was submitted from the project support page.",
    "",
    `Issue type: ${ISSUE_TYPE_LABELS[input.issueType]}`,
    `Customer name: ${input.name || "Not provided"}`,
    `Customer email: ${input.email}`,
    `Project or song: ${input.projectName || "Not provided"}`,
  ];

  if (input.serviceLabel) lines.push(`Service: ${input.serviceLabel}`);
  if (input.amountPaidLabel) lines.push(`Paid now: ${input.amountPaidLabel}`);
  if (input.paymentMode) {
    lines.push(
      `Payment mode: ${input.paymentMode === "deposit" ? "50% deposit" : input.paymentMode}`
    );
  }
  if (input.paypalOrderId) lines.push(`PayPal order: ${input.paypalOrderId}`);

  lines.push("", "Support message:", input.message);
  return lines.join("\n");
}

function normalizeIssueType(value) {
  const normalized = sanitizeText(value, 40);
  return ISSUE_TYPE_LABELS[normalized] ? normalized : "";
}

function sanitizeText(value, maxLength) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, maxLength);
}

function isRateLimited({ req, email, rateStore, now, rateLimitMs }) {
  const ip = getClientIp(req);
  const keys = [`email-ip:${email}:${ip}`, `ip:${ip}`];
  if (
    keys.some((key) => {
      const lastSubmissionAt = rateStore.get(key);
      return lastSubmissionAt && now - lastSubmissionAt < rateLimitMs;
    })
  )
    return true;
  keys.forEach((key) => rateStore.set(key, now));
  return false;
}

function getClientIp(req) {
  const forwardedFor =
    req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

const handler = createProjectSupportHandler();
module.exports = handler;
module.exports.createProjectSupportHandler = createProjectSupportHandler;
module.exports._private = {
  buildSupportSubject,
  buildSupportText,
  normalizeIssueType,
  sanitizeText,
  sendSupportRequest,
};
