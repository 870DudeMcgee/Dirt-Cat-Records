const DEFAULT_MAX_JSON_BODY_BYTES = 32 * 1024;

async function readJsonBody(req, options = {}) {
  const maxBytes = options.maxBytes || DEFAULT_MAX_JSON_BODY_BYTES;
  const contentLength = Number(req.headers?.['content-length']);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw createHttpError(413, 'Request payload is too large');
  }

  if (typeof req.body === 'string') return parseJson(req.body);
  if (Buffer.isBuffer(req.body)) return parseJson(req.body.toString('utf8'));
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  let bytesRead = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytesRead += buffer.length;
    if (bytesRead > maxBytes) throw createHttpError(413, 'Request payload is too large');
    chunks.push(buffer);
  }

  return parseJson(Buffer.concat(chunks).toString('utf8'));
}

function parseJson(rawBody) {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch (_error) {
    throw createHttpError(400, 'Invalid JSON payload');
  }
}

function sendJson(res, status, body) {
  if (typeof res.setHeader === 'function') res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(body);
}

function methodNotAllowed(res) {
  return sendJson(res, 405, { error: 'Method not allowed' });
}

function createHttpError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

module.exports = {
  DEFAULT_MAX_JSON_BODY_BYTES,
  createHttpError,
  methodNotAllowed,
  readJsonBody,
  sendJson,
};
