const test = require("node:test");
const assert = require("node:assert/strict");
const { createRouter } = require("../lib/http/router");

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("router matches correct method and pathname", async () => {
  const router = createRouter();
  let getCalled = false;
  let postCalled = false;

  router.get("/test", (req, res) => {
    getCalled = true;
    res.status(200).json({ ok: true });
  });

  router.post("/test", (req, res) => {
    postCalled = true;
    res.status(201).json({ created: true });
  });

  const handler = router.handler();

  const res1 = mockResponse();
  await handler({ method: "GET", url: "/test" }, res1);
  assert.ok(getCalled);
  assert.equal(res1.statusCode, 200);
  assert.deepEqual(res1.body, { ok: true });

  const res2 = mockResponse();
  await handler({ method: "POST", url: "/test" }, res2);
  assert.ok(postCalled);
  assert.equal(res2.statusCode, 201);
  assert.deepEqual(res2.body, { created: true });
});

test("router extracts path parameters correctly", async () => {
  const router = createRouter();
  let id = null;

  router.get("/projects/:projectId/files/:fileId", (req, res) => {
    id = `${req.params.projectId}-${req.params.fileId}`;
    res.status(200).json({ id });
  });

  const handler = router.handler();
  const res = mockResponse();
  await handler({ method: "GET", url: "/projects/p-123/files/f-456" }, res);

  assert.equal(id, "p-123-f-456");
  assert.equal(res.statusCode, 200);
});

test("router executes middleware chain in order", async () => {
  const router = createRouter();
  const sequence = [];

  router.use((req, res, next) => {
    sequence.push(1);
    next();
  });

  router.use((req, res, next) => {
    sequence.push(2);
    next();
  });

  router.get("/test", (req, res) => {
    sequence.push(3);
    res.status(200).json({ ok: true });
  });

  const handler = router.handler();
  const res = mockResponse();
  await handler({ method: "GET", url: "/test" }, res);

  assert.deepEqual(sequence, [1, 2, 3]);
});

test("router handles errors in handler chain gracefully", async () => {
  const router = createRouter();

  router.get("/error", () => {
    const error = new Error("Boom");
    error.statusCode = 400;
    throw error;
  });

  const handler = router.handler();
  const res = mockResponse();
  await handler({ method: "GET", url: "/error" }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: "Boom" });
});

test("router returns 404 for unmatched routes", async () => {
  const router = createRouter();
  const handler = router.handler();
  const res = mockResponse();
  await handler({ method: "GET", url: "/non-existent" }, res);

  assert.equal(res.statusCode, 404);
  assert.match(res.body.error, /Route GET \/non-existent not found/);
});
