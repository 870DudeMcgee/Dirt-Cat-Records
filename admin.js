(function () {
  let supabaseClient = null;
  let accessToken = null;
  let latestRunId =
    window.localStorage.getItem("dcr_latest_test_run_id") || null;
  let selectedProjectId = null;
  const portalView = window.PortalView;
  const PRODUCTION_ORIGIN = "https://dirtcatrecords.com";
  const PROJECT_STATUS_OPTIONS = [
    "lead_new",
    "awaiting_files",
    "files_submitted",
    "reviewing",
    "quoted",
    "quote_sent",
    "quote_accepted",
    "paid",
    "mixing",
    "revision_requested",
    "revision_in_progress",
    "finals_ready",
    "balance_due",
    "delivered",
    "approved",
    "completed",
    "closed",
  ];

  document.addEventListener("DOMContentLoaded", initAdmin);

  async function initAdmin() {
    bindActions();
    try {
      await initAuth();
      await loadOverview();
      await loadSetup();
      await loadRuns();
    } catch (error) {
      setStatus(error.message || "Unable to initialize admin setup.");
      renderOverview(emptyOverview());
      renderSetup({ sections: {} });
    }
  }

  function bindActions() {
    document
      .getElementById("admin-refresh")
      ?.addEventListener("click", refreshAdmin);
    document
      .getElementById("overview-queue")
      ?.addEventListener("click", handleProjectDetailClick);
    document
      .getElementById("project-detail")
      ?.addEventListener("submit", handleProjectDetailSubmit);
    document
      .getElementById("run-owner-proof")
      ?.addEventListener("click", runOwnerProof);
    document
      .getElementById("run-simulation")
      ?.addEventListener("click", () => runTest("simulation"));
    document
      .getElementById("run-sandbox")
      ?.addEventListener("click", () => runTest("sandbox"));
    document
      .getElementById("cleanup-run")
      ?.addEventListener("click", cleanupRun);
    document
      .getElementById("admin-magic-link-form")
      ?.addEventListener("submit", sendMagicLink);
  }

  async function initAuth() {
    const configResponse = await fetch("/api/public/config");
    const config = await configResponse.json();
    supabaseClient = window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublicKey
    );
    const { data } = await supabaseClient.auth.getSession();
    accessToken = data.session?.access_token || "";
    document.getElementById("cleanup-run").disabled = !latestRunId;
  }

  async function refreshAdmin() {
    await loadOverview();
    await loadSetup();
    await loadRuns();
  }

  async function sendMagicLink(event) {
    event.preventDefault();
    const email = new FormData(event.target).get("email");
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getMagicLinkRedirectUrl() },
    });
    setStatus(
      error ? error.message : "Check your email for the admin magic link."
    );
  }

  function getMagicLinkRedirectUrl() {
    const { hostname, origin, pathname } = window.location;
    if (/\.vercel\.app$/i.test(hostname)) {
      return `${PRODUCTION_ORIGIN}${pathname}`;
    }
    return `${origin}${pathname}`;
  }

  async function loadSetup() {
    try {
      const data = await api("/api/admin/setup-wizard?action=setup");
      setStatus("");
      renderSetup(data.setup);
    } catch (error) {
      setStatus(error.message || "Unable to load setup status.");
      renderSetup({ sections: {} });
    }
  }

  async function loadOverview() {
    try {
      const data = await api("/api/admin/overview");
      renderOverview(data.overview || emptyOverview());
    } catch (error) {
      setStatus(error.message || "Unable to load admin overview.");
      renderOverview(emptyOverview());
    }
  }

  async function handleProjectDetailClick(event) {
    const button = event.target.closest("[data-project-detail-id]");
    if (!button) return;
    const projectId = button.getAttribute("data-project-detail-id");
    if (!projectId) return;

    button.disabled = true;
    try {
      await loadProjectDetail(projectId);
    } catch (error) {
      renderProjectDetailError(
        error.message || "Unable to load project detail."
      );
    } finally {
      button.disabled = false;
    }
  }

  async function handleProjectDetailSubmit(event) {
    if (event.target.closest("[data-project-status-form]")) {
      return handleProjectStatusSubmit(event);
    }
    if (event.target.closest("[data-admin-note-form]")) {
      return handleAdminNoteSubmit(event);
    }
    if (event.target.closest("[data-project-delivery-form]")) {
      return handleProjectDeliverySubmit(event);
    }
    if (event.target.closest("[data-project-extra-revision-form]")) {
      return handleProjectExtraRevisionSubmit(event);
    }
  }

  async function handleProjectStatusSubmit(event) {
    const form = event.target.closest("[data-project-status-form]");
    if (!form) return;

    event.preventDefault();
    const projectId = form.getAttribute("data-project-id");
    const statusField = form.querySelector('select[name="status"]');
    const submitButton = form.querySelector('button[type="submit"]');
    if (!projectId || !statusField) return;

    const status = statusField.value;
    submitButton.disabled = true;
    renderProjectStatusMessage("Saving status...");

    try {
      const data = await api("/api/admin/projects?action=status", {
        method: "POST",
        body: JSON.stringify({ projectId, status }),
      });
      selectedProjectId = projectId;
      renderProjectDetail(data.project);
      renderProjectStatusMessage(`Status updated to ${titleCase(status)}.`);
      await loadOverview();
    } catch (error) {
      renderProjectStatusMessage(
        error.message || "Unable to update project status.",
        true
      );
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleAdminNoteSubmit(event) {
    const form = event.target.closest("[data-admin-note-form]");
    if (!form) return;

    event.preventDefault();
    const projectId = form.getAttribute("data-project-id");
    const noteField = form.querySelector('textarea[name="note"]');
    const submitButton = form.querySelector('button[type="submit"]');
    if (!projectId || !noteField) return;

    submitButton.disabled = true;
    renderProjectNoteMessage("Saving note...");

    try {
      const data = await api("/api/admin/projects?action=notes", {
        method: "POST",
        body: JSON.stringify({ projectId, note: noteField.value }),
      });
      selectedProjectId = projectId;
      renderProjectDetail(data.project);
      renderProjectNoteMessage("Note saved.");
    } catch (error) {
      renderProjectNoteMessage(
        error.message || "Unable to save admin note.",
        true
      );
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleProjectDeliverySubmit(event) {
    const form = event.target.closest("[data-project-delivery-form]");
    if (!form) return;

    event.preventDefault();
    const projectId = form.getAttribute("data-project-id");
    const urlField = form.querySelector('input[name="finalDeliveryUrl"]');
    const unlockField = form.querySelector('input[name="unlockDelivery"]');
    const notifyField = form.querySelector('input[name="notifyBalanceDue"]');
    const submitButton = form.querySelector('button[type="submit"]');
    if (!projectId || !urlField) return;

    submitButton.disabled = true;
    renderProjectDeliveryMessage("Saving delivery settings...");

    try {
      const data = await api("/api/admin/projects?action=delivery", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          finalDeliveryUrl: urlField.value,
          unlockDelivery: Boolean(unlockField?.checked),
          notifyBalanceDue: Boolean(notifyField?.checked),
        }),
      });
      selectedProjectId = projectId;
      renderProjectDetail(data.project);
      renderProjectDeliveryMessage(
        unlockField?.checked
          ? "Final delivery unlocked."
          : notifyField?.checked
            ? "Final delivery updated and balance-due email sent."
            : "Final delivery updated."
      );
      await loadOverview();
    } catch (error) {
      renderProjectDeliveryMessage(
        error.message || "Unable to update final delivery.",
        true
      );
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleProjectExtraRevisionSubmit(event) {
    const form = event.target.closest("[data-project-extra-revision-form]");
    if (!form) return;

    event.preventDefault();
    const projectId = form.getAttribute("data-project-id");
    const submitButton = form.querySelector('button[type="submit"]');
    if (!projectId) return;

    submitButton.disabled = true;
    renderProjectRevisionMessage("Allowing one extra revision...");

    try {
      const data = await api("/api/admin/projects?action=extra-revision", {
        method: "POST",
        body: JSON.stringify({ projectId }),
      });
      selectedProjectId = projectId;
      renderProjectDetail(data.project);
      renderProjectRevisionMessage("One extra revision allowed.");
      await loadOverview();
    } catch (error) {
      renderProjectRevisionMessage(
        error.message || "Unable to allow an extra revision.",
        true
      );
    } finally {
      submitButton.disabled = false;
    }
  }

  async function loadRuns() {
    try {
      const data = await api("/api/admin/setup-wizard?action=test-runs");
      const latestRun = data.runs?.[0];
      if (!latestRun) {
        renderOwnerProof(null);
        return;
      }
      latestRunId = latestRun.id;
      window.localStorage.setItem("dcr_latest_test_run_id", latestRunId);
      document.getElementById("cleanup-run").disabled = false;
      renderReport(latestRun.report);
      renderOwnerProof(latestRun.report);
      if (latestRun.report?.ownerProof?.projectId) {
        await loadProjectDetail(latestRun.report.ownerProof.projectId);
      }
    } catch (_error) {
      document.getElementById("cleanup-run").disabled = !latestRunId;
      renderOwnerProof(null);
    }
  }

  async function runOwnerProof() {
    await runTest("sandbox", "v1-usability");
  }

  async function runTest(mode, scenario = "standard") {
    const runningLabel =
      scenario === "v1-usability" ? "Running owner proof" : `Running ${mode}`;
    renderReport({
      status: "running",
      steps: [{ label: runningLabel, status: "running" }],
    });
    if (scenario === "v1-usability") {
      renderOwnerProof(
        {
          ownerProof: {
            customerEmail: "",
            projectId: "",
            previewStates: [],
          },
        },
        true
      );
    }
    try {
      const data = await api("/api/admin/setup-wizard?action=test-runs", {
        method: "POST",
        body: JSON.stringify({ mode, scenario }),
      });
      latestRunId = data.id;
      window.localStorage.setItem("dcr_latest_test_run_id", latestRunId);
      document.getElementById("cleanup-run").disabled = !latestRunId;
      renderReport(data.report);
      renderOwnerProof(data.report);
      await loadOverview();
      if (data.report?.ownerProof?.projectId) {
        await loadProjectDetail(data.report.ownerProof.projectId);
      }
    } catch (error) {
      renderReport({
        status: "failed",
        steps: [
          { label: `Run ${mode}`, status: "failed", error: error.message },
        ],
      });
      if (scenario === "v1-usability") {
        renderOwnerProof(null);
      }
    }
  }

  async function cleanupRun() {
    if (!latestRunId) return;
    try {
      const data = await api("/api/admin/setup-wizard?action=cleanup", {
        method: "POST",
        body: JSON.stringify({ testRunId: latestRunId }),
      });
      renderReport(data.report);
      renderOwnerProof(data.report);
    } catch (error) {
      renderReport({
        status: "failed",
        steps: [
          {
            label: "Clean up test data",
            status: "failed",
            error: error.message,
          },
        ],
      });
    }
  }

  async function loadProjectDetail(projectId) {
    selectedProjectId = projectId;
    renderProjectDetailLoading(projectId);
    const data = await api(
      `/api/admin/projects?action=detail&projectId=${encodeURIComponent(projectId)}`
    );
    renderProjectDetail(data.project);
    return data.project;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Admin request failed.");
    return body;
  }

  function renderSetup(setup) {
    const container = document.getElementById("setup-sections");
    if (!container) return;
    container.innerHTML = Object.entries(setup.sections || {})
      .map(
        ([key, section]) => `
      <article class="setup-card setup-card-${section.status}">
        <h2>${escapeHtml(titleCase(key))}</h2>
        <p>${escapeHtml(section.provider?.detail || section.provider?.error || section.status)}</p>
        <dl>
          ${Object.entries(section.requiredEnv || {})
            .map(
              ([envKey, value]) => `
            <div><dt>${escapeHtml(envKey)}</dt><dd>${value.present ? "Present" : "Missing"}</dd></div>
          `
            )
            .join("")}
        </dl>
      </article>
    `
      )
      .join("");
  }

  function renderOverview(overview) {
    renderOverviewMetrics(overview.metrics || []);
    renderOverviewQueue(overview.queues || {});
    renderOverviewEvents(overview.recentEvents || []);

    const updated = document.getElementById("overview-updated");
    if (updated)
      updated.textContent = overview.generatedAt
        ? `Updated ${formatDateTime(overview.generatedAt)}`
        : "";
  }

  function renderOverviewMetrics(metrics) {
    const container = document.getElementById("overview-metrics");
    if (!container) return;
    container.innerHTML = metrics
      .map(
        (metric) => `
      <article class="overview-metric">
        <span>${escapeHtml(metric.label)}</span>
        <strong>${escapeHtml(metric.count)}</strong>
      </article>
    `
      )
      .join("");
  }

  function renderOverviewQueue(queues) {
    const container = document.getElementById("overview-queue");
    if (!container) return;
    const items = [
      ...(queues.newLeads || []).map((lead) => ({
        label: "New Lead",
        title:
          lead.projectTitle || lead.artistName || lead.email || "Untitled lead",
        detail: lead.email,
        time: lead.createdAt,
      })),
      ...(queues.awaitingFiles || []).map((project) =>
        projectQueueItem("Awaiting Files", project)
      ),
      ...(queues.filesSubmitted || []).map((project) =>
        projectQueueItem("Files Submitted", project)
      ),
      ...(queues.activeProjects || []).map((project) =>
        projectQueueItem("Active Project", project)
      ),
      ...(queues.revisionRequests || []).map((revision) => ({
        label: "Revision",
        projectId: revision.projectId || "",
        title:
          revision.projectTitle ||
          revision.artistName ||
          revision.projectCode ||
          "Revision request",
        detail: revision.notes,
        time: revision.createdAt,
      })),
      ...(queues.finalsReady || []).map((project) =>
        projectQueueItem("Finals Ready", project)
      ),
      ...(queues.balancesDue || []).map((project) => ({
        ...projectQueueItem("Balance Due", project),
        detail: `${project.balanceDueLabel} remaining`,
      })),
    ].slice(0, 12);

    container.innerHTML = items.length
      ? items.map(renderOverviewItem).join("")
      : '<p class="overview-empty">No priority items.</p>';
  }

  function renderOverviewEvents(events) {
    const container = document.getElementById("overview-events");
    if (!container) return;
    container.innerHTML = events.length
      ? events
          .slice(0, 12)
          .map((event) =>
            renderOverviewItem({
              label: titleCase(event.eventType || "Event"),
              title: event.message || event.projectId || "Project event",
              detail: event.actorType ? `By ${titleCase(event.actorType)}` : "",
              time: event.createdAt,
            })
          )
          .join("")
      : '<p class="overview-empty">No recent activity.</p>';
  }

  function projectQueueItem(label, project) {
    return {
      label,
      projectId: project.id || "",
      title:
        project.title ||
        project.projectTitle ||
        project.artistName ||
        project.projectCode ||
        "Untitled project",
      detail: project.projectCode || project.statusLabel || "",
      time: project.updatedAt || project.createdAt,
      href: safeHttpUrl(
        project.driveProjectFolderUrl ||
          project.driveUploadFolderUrl ||
          project.driveFinalsFolderUrl ||
          project.finalDeliveryUrl
      ),
    };
  }

  function renderOverviewItem(item) {
    const safeHref = safeHttpUrl(item.href);
    const action = safeHref
      ? `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer">Open</a>`
      : "";
    const detailAction = item.projectId
      ? `<button class="overview-link-button" type="button" data-project-detail-id="${escapeHtml(item.projectId)}">View</button>`
      : "";
    return `
      <article class="overview-item">
        <div>
          <p>${escapeHtml(item.label)}</p>
          <h4>${escapeHtml(item.title)}</h4>
          ${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ""}
        </div>
        <div class="overview-item-meta">
          ${item.time ? `<time datetime="${escapeHtml(item.time)}">${escapeHtml(formatDateTime(item.time))}</time>` : ""}
          ${detailAction}
          ${action}
        </div>
      </article>
    `;
  }

  function renderProjectDetailLoading(projectId) {
    const container = document.getElementById("project-detail");
    if (!container) return;
    container.innerHTML = `
      <h3>Project Detail</h3>
      <p class="overview-empty">Loading ${escapeHtml(projectId)}...</p>
    `;
  }

  function renderProjectDetailError(message) {
    const container = document.getElementById("project-detail");
    if (!container) return;
    container.innerHTML = `
      <h3>Project Detail</h3>
      <p class="overview-empty">${escapeHtml(message)}</p>
    `;
  }

  function renderProjectDetail(detail) {
    const container = document.getElementById("project-detail");
    if (!container) return;
    if (!detail?.project) {
      renderProjectDetailError("Project detail was empty.");
      return;
    }

    const project = detail.project;
    container.innerHTML = `
      <div class="project-detail-header">
        <div>
          <p class="portal-status-pill">${escapeHtml(project.statusLabel || titleCase(project.status))}</p>
          <h3>${escapeHtml(project.title || project.projectCode || "Project Detail")}</h3>
          <span>${escapeHtml(project.projectCode || project.id)}</span>
        </div>
        <div class="project-detail-total">
          <span>Balance</span>
          <strong>${escapeHtml(detail.financial?.balanceDueLabel || "$0.00")}</strong>
        </div>
      </div>
      <form class="project-status-form" data-project-status-form data-project-id="${escapeHtml(project.id)}">
        <label>
          <span>Status</span>
          <select name="status">
            ${PROJECT_STATUS_OPTIONS.map((status) => `<option value="${escapeHtml(status)}"${status === project.status ? " selected" : ""}>${escapeHtml(titleCase(status))}</option>`).join("")}
          </select>
        </label>
        <button class="btn btn-secondary" type="submit">Update Status</button>
        <p class="project-status-message" id="project-status-message" role="status" aria-live="polite"></p>
      </form>
      <section class="project-note-panel">
        <div class="project-note-panel-header">
          <h4>Private Notes</h4>
          <p>Visible only in the owner dashboard.</p>
        </div>
        <form class="project-note-form" data-admin-note-form data-project-id="${escapeHtml(project.id)}">
          <label>
            <span>Add Note</span>
            <textarea name="note" rows="4" placeholder="Add a private project note for mix direction, follow-up, or customer context." required></textarea>
          </label>
          <button class="btn btn-secondary" type="submit">Save Note</button>
          <p class="project-note-message" id="project-note-message" role="status" aria-live="polite"></p>
        </form>
      </section>
      <section class="project-delivery-panel">
        <div class="project-delivery-panel-header">
          <h4>Final Delivery</h4>
          <p>Set the final file link and unlock it when payment rules allow.</p>
        </div>
        <form class="project-delivery-form" data-project-delivery-form data-project-id="${escapeHtml(project.id)}">
          <label>
            <span>Final Delivery URL</span>
            <input type="url" name="finalDeliveryUrl" value="${escapeHtml(detail.driveLinks?.finalDelivery || "")}" placeholder="https://drive.google.com/..." required>
          </label>
          <label class="project-delivery-toggle">
            <input type="checkbox" name="unlockDelivery" value="1">
            <span>Unlock customer access now</span>
          </label>
          <label class="project-delivery-toggle">
            <input type="checkbox" name="notifyBalanceDue" value="1">
            <span>Send balance-due email now</span>
          </label>
          <button class="btn btn-secondary" type="submit">Save Delivery</button>
          <p class="project-delivery-message" id="project-delivery-message" role="status" aria-live="polite"></p>
        </form>
      </section>
      <div class="project-detail-grid">
        ${renderProjectDetailSection("Customer", [
          ["Email", detail.customer?.email],
          ["Name", detail.customer?.name || "Not set"],
          ["Type", project.projectType],
          ["Service", project.serviceId || "Not set"],
          ["Songs", project.songCount],
        ])}
        ${renderProjectDetailSection("Money", [
          ["Total", detail.financial?.totalAmountLabel],
          ["Paid", detail.financial?.amountPaidLabel],
          ["Balance", detail.financial?.balanceDueLabel],
          ["Final Locked", project.finalDeliveryLocked ? "Yes" : "No"],
        ])}
        ${renderDriveLinks(detail.driveLinks || {})}
        ${renderProjectDetailSection("Revisions", [
          ["Included", detail.revisions?.included],
          ["Used", detail.revisions?.used],
          ["Extra Allowed", detail.revisions?.extraAllowed],
          ["Remaining", detail.revisions?.remaining],
        ])}
      </div>
      <form class="project-extra-revision-form" data-project-extra-revision-form data-project-id="${escapeHtml(project.id)}">
        <button class="btn btn-secondary" type="submit">Allow One Extra Revision</button>
        <p class="project-revision-message" id="project-revision-message" role="status" aria-live="polite"></p>
      </form>
      ${renderLinkedList("Files", detail.files || [], renderFileItem)}
      ${renderLinkedList("Revision Requests", detail.revisions?.items || [], renderRevisionItem)}
      ${renderLinkedList("Payments", detail.payments || [], renderPaymentItem)}
      ${renderLinkedList("Timeline", detail.timeline || [], renderTimelineItem)}
      ${renderLinkedList("Email Events", detail.emailEvents || [], renderEmailEventItem)}
      ${renderLinkedList("Admin Notes", detail.adminNotes || [], renderAdminNoteItem)}
    `;
  }

  function renderProjectDetailSection(title, rows) {
    return `
      <section class="project-detail-section">
        <h4>${escapeHtml(title)}</h4>
        <dl>
          ${rows
            .map(
              ([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value === undefined || value === null || value === "" ? "Not set" : value)}</dd>
            </div>
          `
            )
            .join("")}
        </dl>
      </section>
    `;
  }

  function renderDriveLinks(links) {
    const rows = [
      ["Project", links.project],
      ["Upload", links.upload],
      ["Finals", links.finals],
      ["Delivery", links.finalDelivery],
    ];
    return `
      <section class="project-detail-section">
        <h4>Drive Links</h4>
        <div class="project-link-list">
          ${rows
            .map(([label, href]) => {
              const safeHref = safeHttpUrl(href);
              return safeHref
                ? `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
                : `<span>${escapeHtml(label)} not set</span>`;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderProjectStatusMessage(message, isError = false) {
    const container = document.getElementById("project-status-message");
    if (!container) return;
    container.textContent = message || "";
    container.classList.toggle(
      "project-status-message-error",
      Boolean(isError && message)
    );
  }

  function renderProjectNoteMessage(message, isError = false) {
    const container = document.getElementById("project-note-message");
    if (!container) return;
    container.textContent = message || "";
    container.classList.toggle(
      "project-note-message-error",
      Boolean(isError && message)
    );
  }

  function renderProjectDeliveryMessage(message, isError = false) {
    const container = document.getElementById("project-delivery-message");
    if (!container) return;
    container.textContent = message || "";
    container.classList.toggle(
      "project-delivery-message-error",
      Boolean(isError && message)
    );
  }

  function renderProjectRevisionMessage(message, isError = false) {
    const container = document.getElementById("project-revision-message");
    if (!container) return;
    container.textContent = message || "";
    container.classList.toggle(
      "project-revision-message-error",
      Boolean(isError && message)
    );
  }

  function renderLinkedList(title, items, renderer) {
    return `
      <section class="project-detail-section project-detail-wide">
        <h4>${escapeHtml(title)}</h4>
        <div class="project-record-list">
          ${items.length ? items.map(renderer).join("") : '<p class="overview-empty">None yet.</p>'}
        </div>
      </section>
    `;
  }

  function renderFileItem(file) {
    const href = safeHttpUrl(file.uploadLink);
    return `
      <article class="project-record">
        <div>
          <strong>${escapeHtml(file.statusLabel || titleCase(file.status))}</strong>
          <span>${escapeHtml(file.createdAt ? formatDateTime(file.createdAt) : "")}</span>
        </div>
        ${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">Open File Link</a>` : ""}
      </article>
    `;
  }

  function renderRevisionItem(revision) {
    return `
      <article class="project-record">
        <div>
          <strong>${escapeHtml(titleCase(revision.status))}${revision.isExtraRevision ? " Extra" : ""}</strong>
          <span>${escapeHtml(revision.notes || "No notes")}</span>
        </div>
        <time datetime="${escapeHtml(revision.createdAt || "")}">${escapeHtml(revision.createdAt ? formatDateTime(revision.createdAt) : "")}</time>
      </article>
    `;
  }

  function renderPaymentItem(payment) {
    return `
      <article class="project-record">
        <div>
          <strong>${escapeHtml(payment.amountLabel || "$0.00")} ${escapeHtml(payment.currency || "USD")}</strong>
          <span>${escapeHtml(titleCase(payment.paymentPurpose || payment.status))}</span>
        </div>
        <time datetime="${escapeHtml(payment.createdAt || "")}">${escapeHtml(payment.createdAt ? formatDateTime(payment.createdAt) : "")}</time>
      </article>
    `;
  }

  function renderTimelineItem(item) {
    return `
      <article class="project-record">
        <div>
          <strong>${escapeHtml(titleCase(item.eventType || "Event"))}</strong>
          <span>${escapeHtml(item.message || "")}</span>
        </div>
        <time datetime="${escapeHtml(item.createdAt || "")}">${escapeHtml(item.createdAt ? formatDateTime(item.createdAt) : "")}</time>
      </article>
    `;
  }

  function renderEmailEventItem(item) {
    return `
      <article class="project-record">
        <div>
          <strong>${escapeHtml(titleCase(item.emailType || "Email"))}</strong>
          <span>${escapeHtml(`${item.status || "unknown"} to ${item.recipient || "unknown recipient"}`)}</span>
        </div>
        <time datetime="${escapeHtml(item.createdAt || "")}">${escapeHtml(item.createdAt ? formatDateTime(item.createdAt) : "")}</time>
      </article>
    `;
  }

  function renderAdminNoteItem(item) {
    return `
      <article class="project-record project-note-record">
        <div>
          <strong>Private Note</strong>
          <span>${escapeHtml(item.note || "")}</span>
        </div>
        <time datetime="${escapeHtml(item.createdAt || "")}">${escapeHtml(item.createdAt ? formatDateTime(item.createdAt) : "")}</time>
      </article>
    `;
  }

  function emptyOverview() {
    const metrics = [
      ["newLeads", "New Leads"],
      ["awaitingFiles", "Awaiting Files"],
      ["filesSubmitted", "Files Submitted"],
      ["activeProjects", "Active Projects"],
      ["revisionRequests", "Revision Requests"],
      ["finalsReady", "Finals Ready"],
      ["balancesDue", "Balances Due"],
    ].map(([key, label]) => ({ key, label, count: 0 }));
    return {
      metrics,
      queues: {
        newLeads: [],
        awaitingFiles: [],
        filesSubmitted: [],
        activeProjects: [],
        revisionRequests: [],
        finalsReady: [],
        balancesDue: [],
      },
      recentEvents: [],
    };
  }

  function renderReport(report) {
    const container = document.getElementById("test-report");
    if (!container) return;
    container.innerHTML = `
      <div class="report-status report-status-${escapeHtml(report.status || "unknown")}">${escapeHtml(report.status || "unknown")}</div>
      <ol class="report-steps">
        ${(report.steps || [])
          .map(
            (step) => `
          <li class="report-step report-step-${escapeHtml(step.status)}">
            <strong>${escapeHtml(step.label || step.key)}</strong>
            <span>${escapeHtml(step.detail || step.error || step.status)}</span>
          </li>
        `
          )
          .join("")}
      </ol>
    `;
  }

  function renderOwnerProof(report, isRunning = false) {
    const container = document.getElementById("owner-proof-view");
    if (!container) return;

    if (isRunning) {
      container.innerHTML =
        '<p class="overview-empty">Building owner proof preview...</p>';
      return;
    }

    const ownerProof = report?.ownerProof;
    if (!ownerProof?.previewStates?.length) {
      container.innerHTML =
        '<p class="overview-empty">Run Owner Proof to render the admin showcase project and customer-side portal previews.</p>';
      return;
    }

    container.innerHTML = `
      <div class="owner-proof-summary">
        <div>
          <p>Customer</p>
          <strong>${escapeHtml(ownerProof.customerEmail || "Not set")}</strong>
        </div>
        <div>
          <p>Showcase Project</p>
          <strong>${escapeHtml(ownerProof.projectId || "Not set")}</strong>
        </div>
        <div>
          <p>Preview States</p>
          <strong>${escapeHtml(ownerProof.previewStates.length)}</strong>
        </div>
      </div>
      <div class="owner-proof-grid">
        ${ownerProof.previewStates
          .map(
            (state) => `
              <article class="owner-proof-state">
                <header>
                  <h3>${escapeHtml(state.label || "Preview")}</h3>
                  ${state.note ? `<p>${escapeHtml(state.note)}</p>` : ""}
                </header>
                <div class="owner-proof-card">
                  ${renderOwnerProofCard(state.project)}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderOwnerProofCard(project) {
    if (!portalView?.buildPortalProjectView || !portalView?.renderProjectCard) {
      return `<pre>${escapeHtml(JSON.stringify(project || {}, null, 2))}</pre>`;
    }
    return portalView.renderProjectCard(
      portalView.buildPortalProjectView(project || {})
    );
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function safeHttpUrl(value) {
    if (!value || typeof value !== "string") return "";
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch (_error) {
      return "";
    }
  }

  function setStatus(message) {
    const status = document.getElementById("admin-status");
    if (status) status.textContent = message || "";
  }

  function escapeHtml(value) {
    return String(value || "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]
    );
  }
})();
