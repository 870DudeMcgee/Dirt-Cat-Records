const { ensureRuntimeEnv } = require('../../env/runtime');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../http/json');
const { normalizeEmail } = require('../../db/studio-records');
const { createFreeReviewWorkflow } = require('../../automation/studio-workflow');

ensureRuntimeEnv();

const DEFAULT_RATE_LIMIT_MS = 15 * 60 * 1000;
const DEFAULT_RATE_STORE = new Map();
const MAX_SHORT_TEXT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_REFERENCE_LINKS = 5;

function createFreeReviewHandler(dependencies = {}) {
  const runWorkflow = dependencies.runWorkflow || createFreeReviewWorkflow();
  const rateStore = dependencies.rateStore || DEFAULT_RATE_STORE;
  const now = dependencies.now || (() => Date.now());
  const rateLimitMs = dependencies.rateLimitMs || DEFAULT_RATE_LIMIT_MS;

  return async function freeReviewHandler(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 400, { error: error.publicMessage || 'Invalid request' });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendJson(res, 400, { error: 'Invalid request payload.' });
    }
    if (typeof body.website === 'string' && body.website.trim()) {
      return sendJson(res, 400, { error: 'Invalid request payload.' });
    }

    const email = normalizeEmail(body.email);
    const message = sanitizeText(body.message, MAX_MESSAGE_LENGTH);
    const referenceLinks = normalizeReferenceLinks(body.referenceLinks);
    if (!email) return sendJson(res, 400, { error: 'A valid email is required.' });
    if (!message) {
      return sendJson(res, 400, { error: 'A short message is required.' });
    }
    if (referenceLinks === null) return sendJson(res, 400, { error: 'Reference links must be valid URLs.' });
    if (isRateLimited({ req, email, rateStore, now: now(), rateLimitMs })) {
      return sendJson(res, 429, { error: 'Please wait before submitting another free review.' });
    }

    try {
      const result = await runWorkflow({
        email,
        name: sanitizeText(body.name, MAX_SHORT_TEXT_LENGTH),
        artistName: sanitizeText(body.artistName, MAX_SHORT_TEXT_LENGTH),
        projectTitle: sanitizeText(body.projectTitle, MAX_SHORT_TEXT_LENGTH),
        message,
        referenceLinks,
      });
      return sendJson(res, 200, { ok: true, projectId: result.project.id });
    } catch (error) {
      console.error('Free review submission failed:', { message: error.message });
      return sendJson(res, 500, { error: 'Free review submission failed.' });
    }
  };
}

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, maxLength);
}

function normalizeReferenceLinks(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_REFERENCE_LINKS) return null;
  const links = [];
  for (const link of value) {
    const trimmed = sanitizeText(link, 500);
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      links.push(url.toString());
    } catch (_error) {
      return null;
    }
  }
  return links;
}

function isRateLimited({ req, email, rateStore, now, rateLimitMs }) {
  const ip = getClientIp(req);
  const keys = [`email-ip:${email}:${ip}`, `ip:${ip}`];
  if (keys.some((key) => {
    const lastSubmissionAt = rateStore.get(key);
    return lastSubmissionAt && now - lastSubmissionAt < rateLimitMs;
  })) return true;
  keys.forEach((key) => rateStore.set(key, now));
  return false;
}

function getClientIp(req) {
  const forwardedFor = req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

const handler = createFreeReviewHandler();
module.exports = handler;
module.exports.createFreeReviewHandler = createFreeReviewHandler;
