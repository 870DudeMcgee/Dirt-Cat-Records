const DRIVE_API_BASE_URL = 'https://www.googleapis.com/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SUBFOLDERS = Object.freeze([
  '01 Client Uploads',
  '02 References',
  '03 Working',
  '04 Finals',
  '05 Admin Notes',
]);

function getDriveConfig(env = process.env) {
  const config = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    refreshToken: env.GOOGLE_REFRESH_TOKEN,
    projectsFolderId: env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID,
  };
  if (!config.clientId || !config.clientSecret || !config.refreshToken || !config.projectsFolderId) {
    throw new Error('Google Drive automation is not configured.');
  }
  return config;
}

async function createDriveProjectFolders(project, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const config = getDriveConfig(env);
  const accessToken = await getAccessToken(config, fetchImpl);

  const projectFolder = await createFolder({
    accessToken,
    fetchImpl,
    name: buildProjectFolderName(project),
    parentId: config.projectsFolderId,
  });

  const subfolders = {};
  for (const name of SUBFOLDERS) {
    subfolders[name] = await createFolder({
      accessToken,
      fetchImpl,
      name,
      parentId: projectFolder.id,
    });
  }

  if (project.customerEmail) {
    await shareFolderWithEmail({
      accessToken,
      fetchImpl,
      folderId: subfolders['01 Client Uploads'].id,
      email: project.customerEmail,
    });
  }

  return {
    projectFolderId: projectFolder.id,
    projectFolderUrl: projectFolder.webViewLink,
    uploadFolderId: subfolders['01 Client Uploads'].id,
    uploadFolderUrl: subfolders['01 Client Uploads'].webViewLink,
    finalsFolderId: subfolders['04 Finals'].id,
    finalsFolderUrl: subfolders['04 Finals'].webViewLink,
  };
}

async function deleteDriveFolder(folderId, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const config = getDriveConfig(env);
  const accessToken = await getAccessToken(config, fetchImpl);
  const response = await fetchImpl(`${DRIVE_API_BASE_URL}/files/${encodeURIComponent(folderId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Unable to delete Drive folder: ${response.status}`);
  }
}

async function getAccessToken(config, fetchImpl) {
  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });
  const body = await readJson(response);
  if (!response.ok || !body.access_token) {
    throw new Error(`Unable to refresh Google access token: ${body.error || response.status}`);
  }
  return body.access_token;
}

async function createFolder({ accessToken, fetchImpl, name, parentId }) {
  const existingFolder = await findFolder({ accessToken, fetchImpl, name, parentId });
  if (existingFolder) return existingFolder;

  const url = new URL(`${DRIVE_API_BASE_URL}/files`);
  url.searchParams.set('fields', 'id,webViewLink');
  url.searchParams.set('supportsAllDrives', 'true');
  const response = await fetchImpl(String(url), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  const body = await readJson(response);
  if (!response.ok || !body.id) {
    throw new Error(`Unable to create Google Drive folder: ${body.error?.message || response.status}`);
  }
  return body;
}

async function findFolder({ accessToken, fetchImpl, name, parentId }) {
  const url = new URL(`${DRIVE_API_BASE_URL}/files`);
  url.searchParams.set('fields', 'files(id,webViewLink)');
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('includeItemsFromAllDrives', 'true');
  url.searchParams.set('q', [
    `name = '${escapeDriveQueryValue(name)}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `'${escapeDriveQueryValue(parentId)}' in parents`,
    'trashed = false',
  ].join(' and '));

  const response = await fetchImpl(String(url), {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`Unable to search Google Drive folders: ${body.error?.message || response.status}`);
  }
  return body.files?.[0] || null;
}

async function shareFolderWithEmail({ accessToken, fetchImpl, folderId, email }) {
  const url = new URL(`${DRIVE_API_BASE_URL}/files/${encodeURIComponent(folderId)}/permissions`);
  url.searchParams.set('sendNotificationEmail', 'false');
  url.searchParams.set('supportsAllDrives', 'true');
  const response = await fetchImpl(String(url), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'user',
      role: 'writer',
      emailAddress: email,
    }),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`Unable to share Google Drive upload folder: ${body.error?.message || response.status}`);
  }
  return body;
}

function buildProjectFolderName(project) {
  return [
    project.projectCode,
    cleanFolderPart(project.artistName || 'Unknown Artist'),
    cleanFolderPart(project.projectTitle || 'Untitled Project'),
  ].filter(Boolean).join(' - ');
}

function cleanFolderPart(value) {
  return String(value || '')
    .replace(/[/:\\?*"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeDriveQueryValue(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

module.exports = {
  buildProjectFolderName,
  createDriveProjectFolders,
  deleteDriveFolder,
  getDriveConfig,
};
