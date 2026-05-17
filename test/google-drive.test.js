const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildProjectFolderName,
  createDriveProjectFolders,
  getDriveConfig,
} = require('../lib/google/drive');

test('buildProjectFolderName removes unsafe separators', () => {
  assert.equal(
    buildProjectFolderName({ projectCode: 'DCR-000123', artistName: 'Dude/McGee', projectTitle: 'First: Song' }),
    'DCR-000123 - Dude McGee - First Song',
  );
});

test('getDriveConfig requires server credentials', () => {
  assert.throws(() => getDriveConfig({}), /Google Drive automation is not configured/);
});

test('createDriveProjectFolders creates project subfolders and shares upload folder', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method, body: parseRequestBody(options.body) });
    if (String(url).includes('oauth2.googleapis.com')) return jsonResponse({ access_token: 'access-token' });
    if (String(url).includes('/permissions')) return jsonResponse({ id: 'permission-1' });
    return jsonResponse({ id: `folder-${calls.length}`, webViewLink: `https://drive.test/folder-${calls.length}` });
  };

  const result = await createDriveProjectFolders({
    projectCode: 'DCR-000123',
    artistName: 'Dude McGee',
    projectTitle: 'Song One',
    customerEmail: 'buyer@example.com',
  }, {
    fetchImpl,
    env: driveEnv(),
  });

  assert.equal(result.projectFolderId, 'folder-2');
  assert.equal(result.uploadFolderUrl, 'https://drive.test/folder-3');
  assert.ok(calls.some((call) => call.url.includes('/permissions')));
});

function driveEnv() {
  return {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_REFRESH_TOKEN: 'refresh-token',
    GOOGLE_DRIVE_PROJECTS_FOLDER_ID: 'parent-folder',
  };
}

function parseRequestBody(body) {
  if (!body) return null;
  if (typeof body === 'string' && body.startsWith('{')) return JSON.parse(body);
  return String(body);
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
    async text() { return JSON.stringify(body); },
  };
}
