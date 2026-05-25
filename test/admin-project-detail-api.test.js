const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminProjectsHandler } = require("../lib/api/admin/projects");
const {
  addAdminProjectNote,
  buildAdminProjectDetail,
  getAdminProjectDetail,
  allowAdminExtraRevision,
  updateAdminProjectDelivery,
  updateAdminProjectStatus,
} = require("../lib/db/studio-records");

test("buildAdminProjectDetail normalizes project detail records", () => {
  const detail = buildAdminProjectDetail({
    project: {
      id: "project-1",
      project_code: "DCR-000123",
      project_type: "paid",
      status: "files_submitted",
      artist_name: "The Client",
      project_title: "Single Mix",
      service_id: "mix",
      song_count: 1,
      included_revisions: 1,
      used_revisions: 0,
      extra_revisions_allowed: 1,
      total_amount: "800.00",
      amount_paid: "400.00",
      balance_due: "400.00",
      final_delivery_locked: true,
      drive_project_folder_url: "https://drive.test/project",
      drive_upload_folder_url: "https://drive.test/upload",
      drive_finals_folder_url: "https://drive.test/finals",
      final_delivery_url: "",
      created_at: "2026-05-18T10:00:00.000Z",
      updated_at: "2026-05-18T12:00:00.000Z",
      customers: {
        id: "customer-1",
        email: "client@example.com",
        name: "Client Name",
      },
    },
    files: [
      {
        id: "file-1",
        upload_link: "https://dropbox.test/files",
        version: 1,
        status: "submitted",
        created_at: "2026-05-18T11:00:00.000Z",
      },
    ],
    revisions: [
      {
        id: "revision-1",
        status: "requested",
        notes: "More vocal",
        is_extra_revision: false,
        created_at: "2026-05-18T13:00:00.000Z",
      },
    ],
    payments: [
      {
        id: "payment-1",
        payment_purpose: "checkout",
        status: "paid",
        amount: "400.00",
        currency: "USD",
        created_at: "2026-05-18T09:00:00.000Z",
      },
    ],
    events: [
      {
        id: "event-1",
        event_type: "files_submitted",
        actor_type: "customer",
        message: "Files received.",
        created_at: "2026-05-18T11:00:00.000Z",
      },
    ],
    emailEvents: [
      {
        id: "email-1",
        email_type: "upload_instructions",
        recipient: "client@example.com",
        status: "sent",
        created_at: "2026-05-18T09:30:00.000Z",
      },
    ],
    adminNotes: [
      {
        id: "note-1",
        note: "Client wants brighter vocals.",
        created_at: "2026-05-18T09:45:00.000Z",
      },
    ],
  });

  assert.equal(detail.project.projectCode, "DCR-000123");
  assert.equal(detail.customer.email, "client@example.com");
  assert.equal(detail.financial.balanceDueLabel, "$400.00");
  assert.equal(detail.revisions.remaining, 2);
  assert.equal(detail.driveLinks.upload, "https://drive.test/upload");
  assert.equal(detail.files[0].uploadLink, "https://dropbox.test/files");
  assert.equal(detail.payments[0].amountLabel, "$400.00");
  assert.equal(detail.timeline[0].message, "Files received.");
  assert.equal(detail.emailEvents[0].emailType, "upload_instructions");
  assert.equal(detail.adminNotes[0].note, "Client wants brighter vocals.");
});

test("getAdminProjectDetail fetches project and related records", async () => {
  const calls = [];
  const detail = await getAdminProjectDetail("project-1", {
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    },
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).includes("/projects"))
        return jsonResponse([
          {
            id: "project-1",
            project_code: "DCR-000123",
            status: "files_submitted",
            balance_due: "0.00",
            customers: { id: "customer-1", email: "client@example.com" },
          },
        ]);
      if (String(url).includes("/project_files"))
        return jsonResponse([
          {
            id: "file-1",
            upload_link: "https://files.test",
            status: "submitted",
          },
        ]);
      if (String(url).includes("/revision_requests")) return jsonResponse([]);
      if (String(url).includes("/payments")) return jsonResponse([]);
      if (String(url).includes("/project_events"))
        return jsonResponse([{ id: "event-1", message: "Project created." }]);
      if (String(url).includes("/email_events")) return jsonResponse([]);
      if (String(url).includes("/admin_notes"))
        return jsonResponse([
          {
            id: "note-1",
            note: "Private note",
            created_at: "2026-05-19T09:00:00.000Z",
          },
        ]);
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(detail.project.id, "project-1");
  assert.equal(detail.files[0].uploadLink, "https://files.test");
  assert.equal(detail.adminNotes[0].note, "Private note");
  assert.ok(calls.some((url) => url.includes("/projects?id=eq.project-1")));
  assert.ok(
    calls.some((url) => url.includes("/project_files?project_id=eq.project-1"))
  );
  assert.ok(
    calls.some((url) => url.includes("/email_events?project_id=eq.project-1"))
  );
  assert.ok(
    calls.some((url) => url.includes("/admin_notes?project_id=eq.project-1"))
  );
});

test("getAdminProjectDetail returns null for missing projects", async () => {
  const detail = await getAdminProjectDetail("missing-project", {
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    },
    fetchImpl: async () => jsonResponse([]),
  });

  assert.equal(detail, null);
});

test("updateAdminProjectStatus updates the project and logs an admin event", async () => {
  const calls = [];
  let currentStatus = "files_submitted";
  const detail = await updateAdminProjectStatus("project-1", "mixing", {
    adminEmail: "josh@example.com",
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    },
    fetchImpl: async (url, options = {}) => {
      calls.push({
        url: String(url),
        method: options.method || "GET",
        body: options.body ? JSON.parse(options.body) : null,
      });

      if (
        String(url).includes("/projects?id=eq.project-1") &&
        (options.method || "GET") === "GET"
      ) {
        return jsonResponse([
          {
            id: "project-1",
            project_code: "DCR-000123",
            status: currentStatus,
            balance_due: "0.00",
            customers: { id: "customer-1", email: "client@example.com" },
          },
        ]);
      }

      if (
        String(url).includes("/projects?id=eq.project-1") &&
        options.method === "PATCH"
      ) {
        currentStatus = "mixing";
        return jsonResponse([
          {
            id: "project-1",
            project_code: "DCR-000123",
            status: "mixing",
            balance_due: "0.00",
            customers: { id: "customer-1", email: "client@example.com" },
          },
        ]);
      }

      if (
        String(url).includes("/project_events") &&
        options.method === "POST"
      ) {
        return jsonResponse([
          {
            id: "event-1",
            project_id: "project-1",
            event_type: "admin_status_updated",
          },
        ]);
      }

      if (String(url).includes("/project_files")) return jsonResponse([]);
      if (String(url).includes("/revision_requests")) return jsonResponse([]);
      if (String(url).includes("/payments")) return jsonResponse([]);
      if (String(url).includes("/admin_notes")) return jsonResponse([]);
      if (String(url).includes("/project_events?project_id=eq.project-1")) {
        return jsonResponse([
          {
            id: "event-1",
            project_id: "project-1",
            event_type: "admin_status_updated",
            actor_type: "admin",
            message: "Project status changed from Files Submitted to Mixing.",
            created_at: "2026-05-19T10:00:00.000Z",
          },
        ]);
      }
      if (String(url).includes("/email_events")) return jsonResponse([]);

      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(detail.project.status, "mixing");
  assert.equal(detail.timeline[0].eventType, "admin_status_updated");

  const patchCall = calls.find((call) => call.method === "PATCH");
  assert.equal(patchCall.body.status, "mixing");

  const eventCall = calls.find(
    (call) => call.url.includes("/project_events") && call.method === "POST"
  );
  assert.equal(eventCall.body.event_type, "admin_status_updated");
  assert.equal(eventCall.body.actor_type, "admin");
  assert.equal(eventCall.body.metadata.fromStatus, "files_submitted");
  assert.equal(eventCall.body.metadata.toStatus, "mixing");
  assert.equal(eventCall.body.metadata.adminEmail, "josh@example.com");
});

test("updateAdminProjectStatus rejects unknown project statuses", async () => {
  await assert.rejects(
    () =>
      updateAdminProjectStatus("project-1", "not_real", {
        adminEmail: "josh@example.com",
        env: {
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-key",
        },
        fetchImpl: async () => jsonResponse([]),
      }),
    /Unsupported project status/
  );
});

test("addAdminProjectNote stores a note and logs an admin event", async () => {
  const calls = [];
  const detail = await addAdminProjectNote(
    "project-1",
    "Need alternate vocal ride version.",
    {
      adminEmail: "josh@example.com",
      env: {
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-key",
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({
          url: String(url),
          method: options.method || "GET",
          body: options.body ? JSON.parse(options.body) : null,
        });

        if (String(url).includes("/projects?id=eq.project-1")) {
          return jsonResponse([
            {
              id: "project-1",
              project_code: "DCR-000123",
              status: "mixing",
              balance_due: "0.00",
              customers: { id: "customer-1", email: "client@example.com" },
            },
          ]);
        }

        if (String(url).includes("/admin_notes") && options.method === "POST") {
          return jsonResponse([
            {
              id: "note-1",
              project_id: "project-1",
              note: "Need alternate vocal ride version.",
              created_at: "2026-05-19T10:00:00.000Z",
            },
          ]);
        }

        if (
          String(url).includes("/project_events") &&
          options.method === "POST"
        ) {
          return jsonResponse([
            {
              id: "event-1",
              project_id: "project-1",
              event_type: "admin_note_added",
            },
          ]);
        }

        if (String(url).includes("/project_files")) return jsonResponse([]);
        if (String(url).includes("/revision_requests")) return jsonResponse([]);
        if (String(url).includes("/payments")) return jsonResponse([]);
        if (String(url).includes("/project_events?project_id=eq.project-1")) {
          return jsonResponse([
            {
              id: "event-1",
              project_id: "project-1",
              event_type: "admin_note_added",
              actor_type: "admin",
              message: "Admin note added.",
              created_at: "2026-05-19T10:00:00.000Z",
            },
          ]);
        }
        if (String(url).includes("/email_events")) return jsonResponse([]);
        if (String(url).includes("/admin_notes?project_id=eq.project-1")) {
          return jsonResponse([
            {
              id: "note-1",
              project_id: "project-1",
              note: "Need alternate vocal ride version.",
              created_at: "2026-05-19T10:00:00.000Z",
            },
          ]);
        }

        throw new Error(`Unexpected URL: ${url}`);
      },
    }
  );

  assert.equal(detail.adminNotes[0].note, "Need alternate vocal ride version.");

  const noteCall = calls.find(
    (call) => call.url.includes("/admin_notes") && call.method === "POST"
  );
  assert.equal(noteCall.body.project_id, "project-1");
  assert.equal(noteCall.body.note, "Need alternate vocal ride version.");

  const eventCall = calls.find(
    (call) => call.url.includes("/project_events") && call.method === "POST"
  );
  assert.equal(eventCall.body.event_type, "admin_note_added");
  assert.equal(eventCall.body.actor_type, "admin");
  assert.equal(eventCall.body.metadata.adminEmail, "josh@example.com");
});

test("addAdminProjectNote rejects blank notes", async () => {
  await assert.rejects(
    () =>
      addAdminProjectNote("project-1", "   ", {
        adminEmail: "josh@example.com",
        env: {
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-key",
        },
        fetchImpl: async () => jsonResponse([]),
      }),
    /admin note is required/
  );
});

test("updateAdminProjectDelivery saves a final delivery URL and keeps delivery locked when balance remains", async () => {
  const calls = [];
  let currentProject = {
    status: "mixing",
    balance_due: "150.00",
    final_delivery_locked: true,
    final_delivery_url: "",
  };
  const detail = await updateAdminProjectDelivery(
    "project-1",
    {
      finalDeliveryUrl: "https://drive.test/final-delivery",
      unlockDelivery: false,
    },
    {
      adminEmail: "josh@example.com",
      env: {
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-key",
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({
          url: String(url),
          method: options.method || "GET",
          body: options.body ? JSON.parse(options.body) : null,
        });

        if (
          String(url).includes("/projects?id=eq.project-1") &&
          (options.method || "GET") === "GET"
        ) {
          return jsonResponse([
            {
              id: "project-1",
              project_code: "DCR-000123",
              status: currentProject.status,
              balance_due: currentProject.balance_due,
              final_delivery_locked: currentProject.final_delivery_locked,
              final_delivery_url: currentProject.final_delivery_url,
              customers: {
                id: "customer-1",
                email: "client@example.com",
                name: "Client Name",
              },
            },
          ]);
        }

        if (
          String(url).includes("/projects?id=eq.project-1") &&
          options.method === "PATCH"
        ) {
          currentProject = {
            ...currentProject,
            status: "balance_due",
            final_delivery_locked: true,
            final_delivery_url: "https://drive.test/final-delivery",
          };
          return jsonResponse([
            {
              id: "project-1",
              project_code: "DCR-000123",
              status: "balance_due",
              balance_due: "150.00",
              final_delivery_locked: true,
              final_delivery_url: "https://drive.test/final-delivery",
              customers: {
                id: "customer-1",
                email: "client@example.com",
                name: "Client Name",
              },
            },
          ]);
        }

        if (
          String(url).includes("/project_events") &&
          options.method === "POST"
        ) {
          return jsonResponse([
            {
              id: "event-1",
              project_id: "project-1",
              event_type: "admin_delivery_updated",
            },
          ]);
        }

        if (String(url).includes("/project_files")) return jsonResponse([]);
        if (String(url).includes("/revision_requests")) return jsonResponse([]);
        if (String(url).includes("/payments")) return jsonResponse([]);
        if (String(url).includes("/admin_notes")) return jsonResponse([]);
        if (String(url).includes("/project_events?project_id=eq.project-1")) {
          return jsonResponse([
            {
              id: "event-1",
              project_id: "project-1",
              event_type: "admin_delivery_updated",
              actor_type: "admin",
              message: "Final delivery updated.",
              created_at: "2026-05-19T11:00:00.000Z",
            },
          ]);
        }
        if (String(url).includes("/email_events")) return jsonResponse([]);

        throw new Error(`Unexpected URL: ${url}`);
      },
    }
  );

  assert.equal(detail.project.status, "balance_due");
  assert.equal(detail.project.finalDeliveryLocked, true);
  assert.equal(
    detail.driveLinks.finalDelivery,
    "https://drive.test/final-delivery"
  );

  const patchCall = calls.find((call) => call.method === "PATCH");
  assert.equal(
    patchCall.body.final_delivery_url,
    "https://drive.test/final-delivery"
  );
  assert.equal(patchCall.body.final_delivery_locked, true);
  assert.equal(patchCall.body.status, "balance_due");
});

test("updateAdminProjectDelivery unlocks delivery, marks delivered, and logs customer email when balance is clear", async () => {
  const calls = [];
  let currentProject = {
    status: "finals_ready",
    balance_due: "0.00",
    final_delivery_locked: true,
    final_delivery_url: "https://drive.test/final-delivery",
  };
  const detail = await updateAdminProjectDelivery(
    "project-1",
    {
      unlockDelivery: true,
    },
    {
      adminEmail: "josh@example.com",
      env: {
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-key",
        SITE_URL: "https://dirtcatrecords.com",
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({
          url: String(url),
          method: options.method || "GET",
          body: options.body ? JSON.parse(options.body) : null,
        });

        if (
          String(url).includes("/projects?id=eq.project-1") &&
          (options.method || "GET") === "GET"
        ) {
          return jsonResponse([
            {
              id: "project-1",
              project_code: "DCR-000123",
              status: currentProject.status,
              balance_due: currentProject.balance_due,
              final_delivery_locked: currentProject.final_delivery_locked,
              final_delivery_url: currentProject.final_delivery_url,
              customers: {
                id: "customer-1",
                email: "client@example.com",
                name: "Client Name",
              },
            },
          ]);
        }

        if (
          String(url).includes("/projects?id=eq.project-1") &&
          options.method === "PATCH"
        ) {
          currentProject = {
            ...currentProject,
            status: "delivered",
            final_delivery_locked: false,
          };
          return jsonResponse([
            {
              id: "project-1",
              project_code: "DCR-000123",
              status: "delivered",
              balance_due: "0.00",
              final_delivery_locked: false,
              final_delivery_url: "https://drive.test/final-delivery",
              customers: {
                id: "customer-1",
                email: "client@example.com",
                name: "Client Name",
              },
            },
          ]);
        }

        if (
          String(url).includes("/project_events") &&
          options.method === "POST"
        ) {
          return jsonResponse([
            {
              id: "event-1",
              project_id: "project-1",
              event_type: "final_delivery_unlocked",
            },
          ]);
        }

        if (
          String(url).includes("/email_events") &&
          options.method === "POST"
        ) {
          return jsonResponse([
            {
              id: "email-event-1",
              project_id: "project-1",
              email_type: "final_delivery_unlocked",
              status: "sent",
            },
          ]);
        }

        if (String(url).includes("/project_files")) return jsonResponse([]);
        if (String(url).includes("/revision_requests")) return jsonResponse([]);
        if (String(url).includes("/payments")) return jsonResponse([]);
        if (String(url).includes("/admin_notes")) return jsonResponse([]);
        if (String(url).includes("/project_events?project_id=eq.project-1")) {
          return jsonResponse([
            {
              id: "event-1",
              project_id: "project-1",
              event_type: "final_delivery_unlocked",
              actor_type: "admin",
              message: "Final delivery unlocked for customer access.",
              created_at: "2026-05-19T11:30:00.000Z",
            },
          ]);
        }
        if (String(url).includes("/email_events?project_id=eq.project-1"))
          return jsonResponse([
            {
              id: "email-event-1",
              project_id: "project-1",
              email_type: "final_delivery_unlocked",
              recipient: "client@example.com",
              status: "sent",
              created_at: "2026-05-19T11:30:00.000Z",
            },
          ]);

        throw new Error(`Unexpected URL: ${url}`);
      },
      sendEmailImpl: async (message) => {
        calls.push({ type: "sendEmail", message });
        return { id: "resend-1" };
      },
    }
  );

  assert.equal(detail.project.status, "delivered");
  assert.equal(detail.project.finalDeliveryLocked, false);

  const patchCall = calls.find((call) => call.method === "PATCH");
  assert.equal(patchCall.body.final_delivery_locked, false);
  assert.equal(patchCall.body.status, "delivered");

  const sendEmailCall = calls.find((call) => call.type === "sendEmail");
  assert.equal(sendEmailCall.message.emailType, "final_delivery_unlocked");
  assert.equal(sendEmailCall.message.to, "client@example.com");
  assert.equal(
    sendEmailCall.message.data.finalDeliveryUrl,
    "https://drive.test/final-delivery"
  );
});

test("updateAdminProjectDelivery can send finals-ready balance-due email while keeping delivery locked", async () => {
  const calls = [];
  let currentProject = {
    status: "mixing",
    balance_due: "150.00",
    final_delivery_locked: true,
    final_delivery_url: "",
  };

  const detail = await updateAdminProjectDelivery(
    "project-1",
    {
      finalDeliveryUrl: "https://drive.test/final-delivery",
      unlockDelivery: false,
      notifyBalanceDue: true,
    },
    {
      adminEmail: "josh@example.com",
      env: {
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-key",
        SITE_URL: "https://dirtcatrecords.com",
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({
          url: String(url),
          method: options.method || "GET",
          body: options.body ? JSON.parse(options.body) : null,
        });

        if (
          String(url).includes("/projects?id=eq.project-1") &&
          (options.method || "GET") === "GET"
        ) {
          return jsonResponse([
            {
              id: "project-1",
              project_code: "DCR-000123",
              status: currentProject.status,
              balance_due: currentProject.balance_due,
              final_delivery_locked: currentProject.final_delivery_locked,
              final_delivery_url: currentProject.final_delivery_url,
              customers: {
                id: "customer-1",
                email: "client@example.com",
                name: "Client Name",
              },
            },
          ]);
        }

        if (
          String(url).includes("/projects?id=eq.project-1") &&
          options.method === "PATCH"
        ) {
          currentProject = {
            ...currentProject,
            status: "balance_due",
            final_delivery_locked: true,
            final_delivery_url: "https://drive.test/final-delivery",
          };
          return jsonResponse([
            {
              id: "project-1",
              project_code: "DCR-000123",
              status: "balance_due",
              balance_due: "150.00",
              final_delivery_locked: true,
              final_delivery_url: "https://drive.test/final-delivery",
              customers: {
                id: "customer-1",
                email: "client@example.com",
                name: "Client Name",
              },
            },
          ]);
        }

        if (
          String(url).includes("/project_events") &&
          options.method === "POST"
        ) {
          return jsonResponse([
            {
              id: "event-1",
              project_id: "project-1",
              event_type: "admin_delivery_updated",
            },
          ]);
        }

        if (
          String(url).includes("/email_events") &&
          options.method === "POST"
        ) {
          return jsonResponse([
            {
              id: "email-event-1",
              project_id: "project-1",
              email_type: "finals_ready_balance_due",
              status: "sent",
            },
          ]);
        }

        if (String(url).includes("/project_files")) return jsonResponse([]);
        if (String(url).includes("/revision_requests")) return jsonResponse([]);
        if (String(url).includes("/payments")) return jsonResponse([]);
        if (String(url).includes("/admin_notes")) return jsonResponse([]);
        if (String(url).includes("/project_events?project_id=eq.project-1")) {
          return jsonResponse([
            {
              id: "event-1",
              project_id: "project-1",
              event_type: "admin_delivery_updated",
              actor_type: "admin",
              message: "Final delivery updated.",
              created_at: "2026-05-19T11:00:00.000Z",
            },
          ]);
        }
        if (String(url).includes("/email_events?project_id=eq.project-1"))
          return jsonResponse([
            {
              id: "email-event-1",
              project_id: "project-1",
              email_type: "finals_ready_balance_due",
              recipient: "client@example.com",
              status: "sent",
              created_at: "2026-05-19T11:30:00.000Z",
            },
          ]);

        throw new Error(`Unexpected URL: ${url}`);
      },
      sendEmailImpl: async (message) => {
        calls.push({ type: "sendEmail", message });
        return { id: "resend-1" };
      },
    }
  );

  assert.equal(detail.project.status, "balance_due");
  assert.equal(detail.project.finalDeliveryLocked, true);

  const sendEmailCall = calls.find((call) => call.type === "sendEmail");
  assert.equal(sendEmailCall.message.emailType, "finals_ready_balance_due");
  assert.equal(sendEmailCall.message.to, "client@example.com");
  assert.equal(
    sendEmailCall.message.data.balanceUrl,
    "https://dirtcatrecords.com/portal.html"
  );

  const emailEventCall = calls.find(
    (call) =>
      call.url && call.url.includes("/email_events") && call.method === "POST"
  );
  assert.equal(emailEventCall.body.email_type, "finals_ready_balance_due");
});

test("updateAdminProjectDelivery rejects unlock when balance remains", async () => {
  await assert.rejects(
    () =>
      updateAdminProjectDelivery(
        "project-1",
        {
          unlockDelivery: true,
        },
        {
          adminEmail: "josh@example.com",
          env: {
            SUPABASE_URL: "https://project.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "service-key",
          },
          fetchImpl: async (url) => {
            if (String(url).includes("/projects?id=eq.project-1")) {
              return jsonResponse([
                {
                  id: "project-1",
                  project_code: "DCR-000123",
                  status: "finals_ready",
                  balance_due: "25.00",
                  final_delivery_locked: true,
                  final_delivery_url: "https://drive.test/final-delivery",
                  customers: { id: "customer-1", email: "client@example.com" },
                },
              ]);
            }
            throw new Error(`Unexpected URL: ${url}`);
          },
        }
      ),
    /Cannot unlock final delivery while balance remains/
  );
});

test("updateAdminProjectDelivery rejects invalid final delivery URLs", async () => {
  await assert.rejects(
    () =>
      updateAdminProjectDelivery(
        "project-1",
        {
          finalDeliveryUrl: "ftp://invalid",
        },
        {
          adminEmail: "josh@example.com",
          env: {
            SUPABASE_URL: "https://project.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "service-key",
          },
          fetchImpl: async () => jsonResponse([]),
        }
      ),
    /A valid final delivery URL is required/
  );
});

test("allowAdminExtraRevision increments extra revision allowance and logs an admin event", async () => {
  const calls = [];
  let currentProject = {
    status: "delivered",
    balance_due: "0.00",
    final_delivery_locked: false,
    final_delivery_url: "https://drive.test/final-delivery",
    included_revisions: 1,
    used_revisions: 1,
    extra_revisions_allowed: 0,
  };
  const detail = await allowAdminExtraRevision("project-1", {
    adminEmail: "josh@example.com",
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    },
    fetchImpl: async (url, options = {}) => {
      calls.push({
        url: String(url),
        method: options.method || "GET",
        body: options.body ? JSON.parse(options.body) : null,
      });

      if (
        String(url).includes("/projects?id=eq.project-1") &&
        (options.method || "GET") === "GET"
      ) {
        return jsonResponse([
          {
            id: "project-1",
            project_code: "DCR-000123",
            status: currentProject.status,
            balance_due: currentProject.balance_due,
            final_delivery_locked: currentProject.final_delivery_locked,
            final_delivery_url: currentProject.final_delivery_url,
            included_revisions: currentProject.included_revisions,
            used_revisions: currentProject.used_revisions,
            extra_revisions_allowed: currentProject.extra_revisions_allowed,
            customers: {
              id: "customer-1",
              email: "client@example.com",
              name: "Client Name",
            },
          },
        ]);
      }

      if (
        String(url).includes("/projects?id=eq.project-1") &&
        options.method === "PATCH"
      ) {
        currentProject = {
          ...currentProject,
          extra_revisions_allowed: 1,
        };
        return jsonResponse([
          {
            id: "project-1",
            project_code: "DCR-000123",
            status: currentProject.status,
            balance_due: currentProject.balance_due,
            final_delivery_locked: currentProject.final_delivery_locked,
            final_delivery_url: currentProject.final_delivery_url,
            included_revisions: currentProject.included_revisions,
            used_revisions: currentProject.used_revisions,
            extra_revisions_allowed: currentProject.extra_revisions_allowed,
            customers: {
              id: "customer-1",
              email: "client@example.com",
              name: "Client Name",
            },
          },
        ]);
      }

      if (
        String(url).includes("/project_events") &&
        options.method === "POST"
      ) {
        return jsonResponse([
          {
            id: "event-1",
            project_id: "project-1",
            event_type: "admin_extra_revision_allowed",
          },
        ]);
      }

      if (String(url).includes("/project_files")) return jsonResponse([]);
      if (String(url).includes("/revision_requests")) return jsonResponse([]);
      if (String(url).includes("/payments")) return jsonResponse([]);
      if (String(url).includes("/admin_notes")) return jsonResponse([]);
      if (String(url).includes("/project_events?project_id=eq.project-1")) {
        return jsonResponse([
          {
            id: "event-1",
            project_id: "project-1",
            event_type: "admin_extra_revision_allowed",
            actor_type: "admin",
            message: "One extra revision was allowed.",
            created_at: "2026-05-19T12:00:00.000Z",
          },
        ]);
      }
      if (String(url).includes("/email_events")) return jsonResponse([]);

      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(detail.revisions.extraAllowed, 1);
  assert.equal(detail.revisions.remaining, 1);

  const patchCall = calls.find((call) => call.method === "PATCH");
  assert.equal(patchCall.body.extra_revisions_allowed, 1);

  const eventCall = calls.find(
    (call) => call.url.includes("/project_events") && call.method === "POST"
  );
  assert.equal(eventCall.body.event_type, "admin_extra_revision_allowed");
  assert.equal(eventCall.body.actor_type, "admin");
  assert.equal(eventCall.body.metadata.adminEmail, "josh@example.com");
});

test("admin project detail endpoint rejects non-admin users", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => {
      const error = new Error("Admin access required.");
      error.statusCode = 403;
      throw error;
    },
  });
  const res = response();

  await handler(
    {
      method: "GET",
      headers: {},
      url: "/api/admin/projects?action=detail&projectId=project-1",
    },
    res
  );

  assert.equal(res.statusCode, 403);
});

test("admin project detail endpoint validates project id", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
  });
  const res = response();

  await handler(
    { method: "GET", headers: {}, url: "/api/admin/projects?action=detail" },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "projectId is required.");
});

test("admin project detail endpoint returns 404 for missing projects", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    records: { getAdminProjectDetail: async () => null },
  });
  const res = response();

  await handler(
    {
      method: "GET",
      headers: {},
      url: "/api/admin/projects?action=detail&projectId=missing-project",
    },
    res
  );

  assert.equal(res.statusCode, 404);
});

test("admin project detail endpoint returns detail data for admins", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    records: {
      getAdminProjectDetail: async (projectId) => ({
        project: { id: projectId, projectCode: "DCR-000123" },
        customer: { email: "client@example.com" },
        files: [],
        revisions: { items: [] },
        payments: [],
        timeline: [],
        emailEvents: [],
      }),
    },
  });
  const res = response();

  await handler(
    {
      method: "GET",
      headers: {},
      url: "/api/admin/projects?action=detail&projectId=project-1",
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.project.project.projectCode, "DCR-000123");
});

test("admin project status endpoint updates status for admins", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    records: {
      updateAdminProjectStatus: async (projectId, status, options) => ({
        project: { id: projectId, projectCode: "DCR-000123", status },
        timeline: [
          {
            eventType: "admin_status_updated",
            metadata: { adminEmail: options.adminEmail },
          },
        ],
      }),
    },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/admin/projects?action=status",
      body: { projectId: "project-1", status: "mixing" },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.project.project.status, "mixing");
  assert.equal(
    res.body.project.timeline[0].metadata.adminEmail,
    "josh@example.com"
  );
});

test("admin project status endpoint validates status input", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    records: {
      updateAdminProjectStatus: async () => {
        throw new Error("should not be called");
      },
    },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/admin/projects?action=status",
      body: { projectId: "project-1" },
    },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "status is required.");
});

test("admin project notes endpoint adds a note for admins", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    records: {
      addAdminProjectNote: async (projectId, note, options) => ({
        project: { id: projectId, projectCode: "DCR-000123", status: "mixing" },
        adminNotes: [
          { id: "note-1", note, createdAt: "2026-05-19T10:00:00.000Z" },
        ],
        timeline: [
          {
            eventType: "admin_note_added",
            metadata: { adminEmail: options.adminEmail },
          },
        ],
      }),
    },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/admin/projects?action=notes",
      body: {
        projectId: "project-1",
        note: "Need alternate vocal ride version.",
      },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(
    res.body.project.adminNotes[0].note,
    "Need alternate vocal ride version."
  );
  assert.equal(
    res.body.project.timeline[0].metadata.adminEmail,
    "josh@example.com"
  );
});

test("admin project notes endpoint validates note input", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    records: {
      addAdminProjectNote: async () => {
        throw new Error("should not be called");
      },
    },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/admin/projects?action=notes",
      body: { projectId: "project-1" },
    },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "note is required.");
});

test("admin project delivery endpoint updates the delivery URL for admins", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    records: {
      updateAdminProjectDelivery: async (_projectId, update, options) => ({
        project: {
          id: "project-1",
          projectCode: "DCR-000123",
          status: "balance_due",
          finalDeliveryLocked: true,
        },
        driveLinks: { finalDelivery: update.finalDeliveryUrl },
        delivery: { notifiedBalanceDue: Boolean(update.notifyBalanceDue) },
        timeline: [
          {
            eventType: "admin_delivery_updated",
            metadata: { adminEmail: options.adminEmail },
          },
        ],
      }),
    },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/admin/projects?action=delivery",
      body: {
        projectId: "project-1",
        finalDeliveryUrl: "https://drive.test/final-delivery",
        unlockDelivery: false,
        notifyBalanceDue: true,
      },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(
    res.body.project.driveLinks.finalDelivery,
    "https://drive.test/final-delivery"
  );
  assert.equal(res.body.project.delivery.notifiedBalanceDue, true);
  assert.equal(
    res.body.project.timeline[0].metadata.adminEmail,
    "josh@example.com"
  );
});

test("admin project delivery endpoint validates project id", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    records: {
      updateAdminProjectDelivery: async () => {
        throw new Error("should not be called");
      },
    },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/admin/projects?action=delivery",
      body: { finalDeliveryUrl: "https://drive.test/final-delivery" },
    },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "projectId is required.");
});

test("admin project extra revision endpoint increments allowance for admins", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    records: {
      allowAdminExtraRevision: async (projectId, options) => ({
        project: { id: projectId, projectCode: "DCR-000123" },
        revisions: {
          included: 1,
          used: 1,
          extraAllowed: 1,
          remaining: 1,
          items: [],
        },
        timeline: [
          {
            eventType: "admin_extra_revision_allowed",
            metadata: { adminEmail: options.adminEmail },
          },
        ],
      }),
    },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/admin/projects?action=extra-revision",
      body: { projectId: "project-1" },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.project.revisions.extraAllowed, 1);
  assert.equal(
    res.body.project.timeline[0].metadata.adminEmail,
    "josh@example.com"
  );
});

test("admin project extra revision endpoint validates project id", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    records: {
      allowAdminExtraRevision: async () => {
        throw new Error("should not be called");
      },
    },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/admin/projects?action=extra-revision",
      body: {},
    },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "projectId is required.");
});

test("admin project detail endpoint only accepts GET", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/admin/projects?action=detail&projectId=project-1",
    },
    res
  );

  assert.equal(res.statusCode, 405);
});

test("admin project status endpoint only accepts POST", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
  });
  const res = response();

  await handler(
    {
      method: "GET",
      headers: {},
      url: "/api/admin/projects?action=status&projectId=project-1&status=mixing",
    },
    res
  );

  assert.equal(res.statusCode, 405);
});

test("admin project notes endpoint only accepts POST", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
  });
  const res = response();

  await handler(
    {
      method: "GET",
      headers: {},
      url: "/api/admin/projects?action=notes&projectId=project-1",
    },
    res
  );

  assert.equal(res.statusCode, 405);
});

test("admin project delivery endpoint only accepts POST", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
  });
  const res = response();

  await handler(
    {
      method: "GET",
      headers: {},
      url: "/api/admin/projects?action=delivery&projectId=project-1",
    },
    res
  );

  assert.equal(res.statusCode, 405);
});

test("admin project extra revision endpoint only accepts POST", async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
  });
  const res = response();

  await handler(
    {
      method: "GET",
      headers: {},
      url: "/api/admin/projects?action=extra-revision&projectId=project-1",
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

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body);
    },
  };
}
