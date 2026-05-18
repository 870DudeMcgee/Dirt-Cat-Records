const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/drive';
const SESSION_PATH = path.join(process.cwd(), '.google-oauth-session.json');

async function main() {
  loadLocalEnv();

  const manualCallbackUrl = process.argv[2] ? String(process.argv[2]).trim() : '';
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const scope = String(process.env.GOOGLE_OAUTH_SCOPE || DEFAULT_SCOPE).trim() || DEFAULT_SCOPE;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set before generating a refresh token.');
  }

  if (manualCallbackUrl) {
    const session = loadPendingSession();
    const callback = parseCallbackUrl({ callbackUrl: manualCallbackUrl, expectedState: session.state });
    const tokenBody = await exchangeCodeForTokens({
      clientId,
      clientSecret,
      redirectUri: session.redirectUri,
      code: callback.code,
      codeVerifier: session.codeVerifier,
    });
    finish(tokenBody);
    return;
  }

  const state = randomUrlSafe(24);
  const codeVerifier = randomUrlSafe(64);
  const codeChallenge = toCodeChallenge(codeVerifier);

  const server = http.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine loopback redirect URL.');
  }

  const redirectUri = `http://127.0.0.1:${address.port}/oauth2/callback`;
  const authorizationUrl = buildAuthorizationUrl({
    clientId,
    redirectUri,
    scope,
    state,
    codeChallenge,
  });

  savePendingSession({ state, codeVerifier, redirectUri });

  console.log('\nOpen this URL in your browser and approve Drive access:\n');
  console.log(authorizationUrl);
  console.log('');
  console.log('Keep this terminal running.');
  console.log('If the browser ends on a 127.0.0.1 URL and the terminal does not finish, copy that full URL and run:');
  console.log('npm run google:refresh-token -- "PASTE_THE_FULL_CALLBACK_URL_HERE"\n');
  openBrowser(authorizationUrl);

  const code = await waitForAuthorizationCode({ server, state });
  const tokenBody = await exchangeCodeForTokens({
    clientId,
    clientSecret,
    redirectUri,
    code,
    codeVerifier,
  });

  finish(tokenBody);
}

function finish(tokenBody) {
  clearPendingSession();

  if (!tokenBody.refresh_token) {
    throw new Error('Google returned no refresh_token. Re-run the script and make sure you approve consent with prompt=consent.');
  }

  console.log('\nRefresh token generated. Add this to your local/Vercel env:\n');
  console.log(`GOOGLE_REFRESH_TOKEN=${tokenBody.refresh_token}`);
  console.log('');
}

function savePendingSession(session) {
  fs.writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2));
}

function loadPendingSession() {
  if (!fs.existsSync(SESSION_PATH)) {
    throw new Error('No pending Google OAuth session found. First run npm run google:refresh-token and open the Google URL it prints.');
  }

  try {
    const session = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'));
    if (!session.state || !session.codeVerifier || !session.redirectUri) {
      throw new Error('Pending session file is incomplete.');
    }
    return session;
  } catch (_error) {
    throw new Error('Pending Google OAuth session is invalid. Re-run npm run google:refresh-token to start over.');
  }
}

function clearPendingSession() {
  if (fs.existsSync(SESSION_PATH)) fs.unlinkSync(SESSION_PATH);
}

function parseCallbackUrl({ callbackUrl, expectedState }) {
  let url;
  try {
    url = new URL(callbackUrl);
  } catch (_error) {
    throw new Error('The callback value must be a full URL that starts with http://127.0.0.1/...');
  }

  const returnedState = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');

  if (returnedState !== expectedState) {
    throw new Error('OAuth state mismatch. Re-run npm run google:refresh-token to start a fresh approval flow.');
  }
  if (error) {
    throw new Error(`Google OAuth error: ${error}`);
  }
  if (!code) {
    throw new Error('Google did not return an authorization code in the callback URL.');
  }

  return { code };
}

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function buildAuthorizationUrl({ clientId, redirectUri, scope, state, codeChallenge }) {
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return String(url);
}

function waitForAuthorizationCode({ server, state }) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close(() => reject(new Error('Timed out waiting for Google authorization response.')));
    }, 5 * 60 * 1000);

    server.on('request', (request, response) => {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (url.pathname !== '/oauth2/callback') {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      const returnedState = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');

      if (returnedState !== state) {
        response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('State mismatch. You can close this window and try again.');
        clearTimeout(timeout);
        server.close(() => reject(new Error('OAuth state mismatch.')));
        return;
      }

      if (error) {
        response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Google returned an error. You can close this window and try again.');
        clearTimeout(timeout);
        server.close(() => reject(new Error(`Google OAuth error: ${error}`)));
        return;
      }

      if (!code) {
        response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('No authorization code was provided. You can close this window and try again.');
        clearTimeout(timeout);
        server.close(() => reject(new Error('Google did not return an authorization code.')));
        return;
      }

      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Authorization received. Return to your terminal.');
      clearTimeout(timeout);
      server.close(() => resolve(code));
    });
  });
}

async function exchangeCodeForTokens({ clientId, clientSecret, redirectUri, code, codeVerifier }) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString(),
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${body.error_description || body.error || response.status}`);
  }
  return body;
}

function openBrowser(url) {
  if (process.platform === 'darwin') {
    execFile('open', [url], () => {});
    return;
  }
  if (process.platform === 'win32') {
    execFile('cmd', ['/c', 'start', '', url], () => {});
    return;
  }
  execFile('xdg-open', [url], () => {});
}

function toCodeChallenge(codeVerifier) {
  return crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function randomUrlSafe(size) {
  return crypto
    .randomBytes(size)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

main().catch((error) => {
  console.error(`\n${error.message}\n`);
  process.exitCode = 1;
});