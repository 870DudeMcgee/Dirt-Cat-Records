const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildProjectFolderName,
  createDriveProjectFolders,
  getDriveConfig,
  isNonGoogleAccountShareError,
  resolveDriveShareEmail,
  verifyDriveAccess,
} = require("../lib/google/drive");

test("buildProjectFolderName removes unsafe separators", () => {
  assert.equal(
    buildProjectFolderName({
      projectCode: "DCR-000123",
      artistName: "Dude/McGee",
      projectTitle: "First: Song",
    }),
    "DCR-000123 - Dude McGee - First Song"
  );
});

test("getDriveConfig requires server credentials", () => {
  assert.throws(
    () => getDriveConfig({}),
    /Google Drive automation is not configured/
  );
});

test("createDriveProjectFolders creates project subfolders and shares upload folder", async () => {
  const calls = [];
  let createdFolderCount = 0;
  const fetchImpl = async (url, options = {}) => {
    calls.push({
      url: String(url),
      method: options.method,
      body: parseRequestBody(options.body),
    });
    if (String(url).includes("oauth2.googleapis.com"))
      return jsonResponse({ access_token: "access-token" });
    if (String(url).includes("/permissions"))
      return jsonResponse({ id: "permission-1" });
    if (options.method === "GET") return jsonResponse({ files: [] });
    createdFolderCount += 1;
    return jsonResponse({
      id: `folder-${createdFolderCount}`,
      webViewLink: `https://drive.test/folder-${createdFolderCount}`,
    });
  };

  const result = await createDriveProjectFolders(
    {
      projectCode: "DCR-000123",
      artistName: "Dude McGee",
      projectTitle: "Song One",
      customerEmail: "buyer@example.com",
    },
    {
      fetchImpl,
      env: driveEnv(),
    }
  );

  assert.equal(result.projectFolderId, "folder-1");
  assert.equal(result.uploadFolderUrl, "https://drive.test/folder-2");
  assert.equal(result.finalsFolderUrl, "https://drive.test/folder-5");
  assert.equal(createdFolderCount, 6);

  const createCalls = calls.filter(
    (call) => call.method === "POST" && call.url.includes("/files?")
  );
  assert.deepEqual(
    createCalls.map((call) => call.body.name),
    [
      "DCR-000123 - Dude McGee - Song One",
      "01 Client Uploads",
      "02 References",
      "03 Working",
      "04 Finals",
      "05 Admin Notes",
    ]
  );
  assert.ok(
    createCalls.every((call) => call.url.includes("supportsAllDrives=true"))
  );
  assert.ok(
    createCalls.every(
      (call) => call.body.mimeType === "application/vnd.google-apps.folder"
    )
  );

  const permissionCall = calls.find((call) =>
    call.url.includes("/permissions")
  );
  assert.ok(permissionCall.url.includes("supportsAllDrives=true"));
  assert.equal(permissionCall.body.emailAddress, "buyer@example.com");
  assert.equal(permissionCall.body.role, "writer");
});

test("createDriveProjectFolders reuses existing folders by parent and name", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({
      url: String(url),
      method: options.method,
      body: parseRequestBody(options.body),
    });
    if (String(url).includes("oauth2.googleapis.com"))
      return jsonResponse({ access_token: "access-token" });
    if (String(url).includes("/permissions"))
      return jsonResponse({ id: "permission-1" });
    if (options.method === "GET")
      return jsonResponse({
        files: [
          {
            id: "existing-folder",
            webViewLink: "https://drive.test/existing-folder",
          },
        ],
      });
    throw new Error(
      "Create should not be called when matching folders already exist."
    );
  };

  const result = await createDriveProjectFolders(
    {
      projectCode: "DCR-000123",
      artistName: "Dude McGee",
      projectTitle: "Song One",
      customerEmail: "buyer@example.com",
    },
    {
      fetchImpl,
      env: driveEnv(),
    }
  );

  assert.equal(result.projectFolderId, "existing-folder");
  assert.equal(result.uploadFolderId, "existing-folder");
  assert.ok(
    calls.some(
      (call) =>
        call.method === "GET" &&
        call.url.includes("includeItemsFromAllDrives=true")
    )
  );
  assert.equal(
    calls.filter(
      (call) => call.method === "POST" && call.url.includes("/files?")
    ).length,
    0
  );
});

test("createDriveProjectFolders keeps folder links when sharing is skipped for non-Google accounts", async () => {
  const calls = [];
  let createdFolderCount = 0;
  const fetchImpl = async (url, options = {}) => {
    calls.push({
      url: String(url),
      method: options.method,
      body: parseRequestBody(options.body),
    });
    if (String(url).includes("oauth2.googleapis.com")) {
      return jsonResponse({ access_token: "access-token" });
    }
    if (String(url).includes("/permissions")) {
      return jsonResponse(
        {
          error: {
            message:
              "Sorry, you cannot share with sb-test@personal.example.com because they do not have a Google Account.",
          },
        },
        403
      );
    }
    if (options.method === "GET") return jsonResponse({ files: [] });
    createdFolderCount += 1;
    return jsonResponse({
      id: `folder-${createdFolderCount}`,
      webViewLink: `https://drive.test/folder-${createdFolderCount}`,
    });
  };

  const result = await createDriveProjectFolders(
    {
      projectCode: "DCR-000123",
      artistName: "Dude McGee",
      projectTitle: "Song One",
      customerEmail: "sb-test@personal.example.com",
    },
    {
      fetchImpl,
      env: driveEnv(),
    }
  );

  assert.equal(result.projectFolderId, "folder-1");
  assert.equal(result.uploadFolderUrl, "https://drive.test/folder-2");
  assert.match(
    result.uploadFolderShareSkippedReason,
    /do not have a Google Account/i
  );
  assert.equal(createdFolderCount, 6);
});

test("createDriveProjectFolders uses override share email outside live mode", async () => {
  const calls = [];
  let createdFolderCount = 0;
  const fetchImpl = async (url, options = {}) => {
    calls.push({
      url: String(url),
      method: options.method,
      body: parseRequestBody(options.body),
    });
    if (String(url).includes("oauth2.googleapis.com")) {
      return jsonResponse({ access_token: "access-token" });
    }
    if (String(url).includes("/permissions")) {
      return jsonResponse({ id: "permission-1" });
    }
    if (options.method === "GET") return jsonResponse({ files: [] });
    createdFolderCount += 1;
    return jsonResponse({
      id: `folder-${createdFolderCount}`,
      webViewLink: `https://drive.test/folder-${createdFolderCount}`,
    });
  };

  const result = await createDriveProjectFolders(
    {
      projectCode: "DCR-000123",
      artistName: "Dude McGee",
      projectTitle: "Song One",
      customerEmail: "sb-test@personal.example.com",
    },
    {
      fetchImpl,
      env: {
        ...driveEnv(),
        PAYPAL_ENV: "sandbox",
        GOOGLE_DRIVE_TEST_SHARE_EMAIL: "real-user@gmail.com",
      },
    }
  );

  const permissionCall = calls.find((call) =>
    call.url.includes("/permissions")
  );
  assert.equal(permissionCall.body.emailAddress, "real-user@gmail.com");
  assert.equal(result.uploadFolderSharedWithEmail, "real-user@gmail.com");
});

test("resolveDriveShareEmail uses override only outside live mode", () => {
  assert.equal(
    resolveDriveShareEmail(
      "sb-test@personal.example.com",
      { PAYPAL_ENV: "sandbox" },
      {
        shareTestEmail: "real-user@gmail.com",
      }
    ),
    "real-user@gmail.com"
  );
  assert.equal(
    resolveDriveShareEmail(
      "buyer@example.com",
      { PAYPAL_ENV: "live" },
      {
        shareTestEmail: "real-user@gmail.com",
      }
    ),
    "buyer@example.com"
  );
});

test("isNonGoogleAccountShareError matches Google account requirement failures", () => {
  assert.equal(
    isNonGoogleAccountShareError(
      "Sorry, you cannot share with sb-test@personal.example.com because they do not have a Google Account."
    ),
    true
  );
  assert.equal(isNonGoogleAccountShareError("Forbidden"), false);
});

test("verifyDriveAccess checks the configured parent folder", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method });
    if (String(url).includes("oauth2.googleapis.com"))
      return jsonResponse({ access_token: "access-token" });
    return jsonResponse({
      id: "parent-folder",
      name: "Projects Root",
      webViewLink: "https://drive.test/parent-folder",
    });
  };

  const result = await verifyDriveAccess({
    fetchImpl,
    env: driveEnv(),
  });

  assert.equal(result.id, "parent-folder");
  assert.ok(calls.some((call) => call.url.includes("/files/parent-folder")));
  assert.ok(calls.some((call) => call.url.includes("supportsAllDrives=true")));
});

function driveEnv() {
  return {
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    GOOGLE_REFRESH_TOKEN: "refresh-token",
    GOOGLE_DRIVE_PROJECTS_FOLDER_ID: "parent-folder",
  };
}

function parseRequestBody(body) {
  if (!body) return null;
  if (typeof body === "string" && body.startsWith("{")) return JSON.parse(body);
  return String(body);
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}
