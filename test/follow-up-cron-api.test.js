const test = require("node:test");
const assert = require("node:assert/strict");
const { createFollowUpsCronHandler } = require("../api/cron/follow-ups");

test("follow-up cron endpoint rejects missing token", async () => {
  const handler = createFollowUpsCronHandler({
    env: { CRON_SECRET: "secret-1" },
  });
  const res = response();

  await handler(
    { method: "GET", headers: {}, url: "/api/cron/follow-ups" },
    res
  );

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Cron access required.");
});

test("follow-up cron endpoint returns follow-up candidates when authorized", async () => {
  const handler = createFollowUpsCronHandler({
    env: { CRON_SECRET: "secret-1" },
    records: {
      getFollowUpCandidates: async () => [
        {
          projectId: "project-1",
          reminderType: "missing_files",
          staleDays: 4,
        },
      ],
    },
  });
  const res = response();

  await handler(
    {
      method: "GET",
      headers: { authorization: "Bearer secret-1" },
      url: "/api/cron/follow-ups",
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.dryRun, true);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.candidates[0].reminderType, "missing_files");
});

test("follow-up cron endpoint queues follow-up jobs when dryRun is false", async () => {
  const handler = createFollowUpsCronHandler({
    env: { CRON_SECRET: "secret-1" },
    records: {
      getFollowUpCandidates: async () => [
        {
          projectId: "project-1",
          customerId: "customer-1",
          reminderType: "missing_files",
          staleDays: 4,
        },
      ],
      queueFollowUpJobs: async () => ({
        queued: [{ projectId: "project-1" }],
        skipped: [],
        failed: [],
      }),
    },
    dispatchPendingFollowUpsImpl: async () => ({
      scannedCount: 1,
      sent: [{ jobId: "job-1" }],
      skipped: [],
      failed: [],
    }),
  });
  const res = response();

  await handler(
    {
      method: "GET",
      headers: { authorization: "Bearer secret-1" },
      url: "/api/cron/follow-ups?dryRun=false&dispatch=true",
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.dryRun, false);
  assert.equal(res.body.queueResults.queued.length, 1);
  assert.equal(res.body.dispatchResults.sent.length, 1);
});

test("follow-up cron endpoint only accepts GET", async () => {
  const handler = createFollowUpsCronHandler({
    env: { CRON_SECRET: "secret-1" },
    records: { getFollowUpCandidates: async () => [] },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: { authorization: "Bearer secret-1" },
      url: "/api/cron/follow-ups",
    },
    res
  );

  assert.equal(res.statusCode, 405);
});

function response() {
  return {
    statusCode: 0,
    body: undefined,
    setHeader() {},
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
