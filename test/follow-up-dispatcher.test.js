const test = require("node:test");
const assert = require("node:assert/strict");
const {
  dispatchPendingFollowUps,
  _private,
} = require("../lib/automation/follow-up-dispatcher");

test("dispatchPendingFollowUps sends reminder and marks job sent", async () => {
  const calls = [];
  const records = {
    listPendingFollowUpJobs: async () => [
      {
        id: "job-1",
        project_id: "project-1",
        customer_id: "customer-1",
        followup_type: "missing_files",
        projects: { id: "project-1", project_code: "DCR-000001" },
        customers: { email: "customer@example.com" },
      },
    ],
    createEmailEvent: async (event) => {
      calls.push({ type: "emailEvent", event });
      return { id: "email-1" };
    },
    updateFollowUpJobStatus: async (jobId, patch) => {
      calls.push({ type: "jobStatus", jobId, patch });
      return { id: jobId, status: patch.status };
    },
    createProjectEvent: async (event) => {
      calls.push({ type: "projectEvent", event });
      return { id: "event-1" };
    },
  };

  const result = await dispatchPendingFollowUps({
    records,
    env: { SITE_URL: "https://dirtcatrecords.com" },
    sendEmailImpl: async (message) => {
      calls.push({ type: "sendEmail", message });
      return { id: "resend-1" };
    },
  });

  assert.equal(result.sent.length, 1);
  assert.equal(result.failed.length, 0);
  assert.equal(result.skipped.length, 0);
  assert.equal(
    calls.find((call) => call.type === "sendEmail").message.emailType,
    "admin_notification"
  );
  assert.equal(
    calls.find((call) => call.type === "jobStatus").patch.status,
    "sent"
  );
  assert.equal(
    calls.find((call) => call.type === "emailEvent").event.emailType,
    "followup_missing_files"
  );
});

test("dispatchPendingFollowUps skips jobs without customer email", async () => {
  const calls = [];
  const result = await dispatchPendingFollowUps({
    records: {
      listPendingFollowUpJobs: async () => [
        {
          id: "job-2",
          project_id: "project-2",
          customer_id: "customer-2",
          followup_type: "pending_quote",
          projects: { id: "project-2", project_code: "DCR-000002" },
          customers: { email: "" },
        },
      ],
      createEmailEvent: async () => {
        throw new Error("createEmailEvent should not run");
      },
      updateFollowUpJobStatus: async (jobId, patch) => {
        calls.push({ type: "jobStatus", jobId, patch });
      },
      createProjectEvent: async (event) => {
        calls.push({ type: "projectEvent", event });
      },
    },
    sendEmailImpl: async () => {
      throw new Error("sendEmail should not run");
    },
  });

  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, "missing_customer_email");
  assert.equal(
    calls.find((call) => call.type === "jobStatus").patch.status,
    "skipped"
  );
});

test("dispatchPendingFollowUps marks failed email attempts", async () => {
  const calls = [];
  const result = await dispatchPendingFollowUps({
    records: {
      listPendingFollowUpJobs: async () => [
        {
          id: "job-3",
          project_id: "project-3",
          customer_id: "customer-3",
          followup_type: "balance_due",
          projects: { id: "project-3", project_code: "DCR-000003" },
          customers: { email: "customer3@example.com" },
        },
      ],
      createEmailEvent: async (event) => {
        calls.push({ type: "emailEvent", event });
      },
      updateFollowUpJobStatus: async (jobId, patch) => {
        calls.push({ type: "jobStatus", jobId, patch });
      },
      createProjectEvent: async (event) => {
        calls.push({ type: "projectEvent", event });
      },
    },
    sendEmailImpl: async () => {
      throw new Error("Resend is down");
    },
  });

  assert.equal(result.failed.length, 1);
  assert.match(result.failed[0].reason, /Resend is down/);
  assert.equal(
    calls.find((call) => call.type === "jobStatus").patch.status,
    "failed"
  );
  assert.equal(
    calls.find((call) => call.type === "emailEvent").event.status,
    "failed"
  );
});

test("dispatchPendingFollowUps does not crash when email event logging fails", async () => {
  const calls = [];
  const result = await dispatchPendingFollowUps({
    records: {
      listPendingFollowUpJobs: async () => [
        {
          id: "job-4",
          project_id: "project-4",
          customer_id: "customer-4",
          followup_type: "missing_files",
          projects: { id: "project-4", project_code: "DCR-000004" },
          customers: { email: "customer4@example.com" },
        },
      ],
      createEmailEvent: async () => {
        throw new Error("email_events unavailable");
      },
      updateFollowUpJobStatus: async (jobId, patch) => {
        calls.push({ type: "jobStatus", jobId, patch });
      },
      createProjectEvent: async (event) => {
        calls.push({ type: "projectEvent", event });
      },
    },
    sendEmailImpl: async () => {
      throw new Error("Resend is down");
    },
  });

  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].jobId, "job-4");
  assert.equal(
    calls.find((call) => call.type === "jobStatus").patch.status,
    "failed"
  );
});

test("buildFollowUpEmail provides a template for each follow-up type", () => {
  const message = _private.buildFollowUpEmail(
    { followup_type: "final_approval", project_id: "project-4" },
    { id: "project-4", project_code: "DCR-000004" },
    { SITE_URL: "https://dirtcatrecords.com" }
  );

  assert.match(message.subject, /approve/i);
  assert.match(message.text, /portal/i);
});
