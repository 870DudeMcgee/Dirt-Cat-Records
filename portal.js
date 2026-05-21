let supabaseClient;
let currentAccessToken;
let magicLinkRequestInFlight = false;
let magicLinkCooldownTimer = null;

const MAGIC_LINK_COOLDOWN_MS = 60 * 1000;
const MAGIC_LINK_STORAGE_KEY = "dcr_portal_magic_link_cooldown_until";
const MAGIC_LINK_DEFAULT_LABEL = "Send Magic Link";
const PORTAL_ACTION_SUCCESS_MESSAGES = {
  fileLink:
    "File link received. Josh has the upload link and will review the files next.",
  revision:
    "Revision request received. Josh has your notes and this project is queued for a revision pass.",
  approval: "Final approved. Josh can close this project out now.",
  balance: "Balance checkout opened in a new tab.",
  quote: "Quote checkout opened in a new tab.",
};

async function initPortal() {
  const configResponse = await fetch("/api/checkout-config");
  const config = await configResponse.json();
  supabaseClient = window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublicKey
  );

  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    await renderProjects(data.session.access_token);
  }

  const form = document.getElementById("magic-link-form");
  refreshMagicLinkButtonState(form);
  if (getStoredMagicLinkCooldownRemainingMs() > 0) {
    startMagicLinkCooldown(form, readMagicLinkCooldownUntil());
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (magicLinkRequestInFlight) return;

    const remainingCooldownMs = getStoredMagicLinkCooldownRemainingMs();
    if (remainingCooldownMs > 0) {
      setPortalStatus(formatMagicLinkRateLimitMessage(remainingCooldownMs));
      refreshMagicLinkButtonState(form);
      return;
    }

    const email = String(new FormData(form).get("email") || "")
      .trim()
      .toLowerCase();
    magicLinkRequestInFlight = true;
    refreshMagicLinkButtonState(form);
    setPortalStatus("Preparing your portal access...", "pending");

    try {
      const prepareResponse = await fetch("/api/portal/actions?action=auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const prepareBody = await prepareResponse.json();
      if (!prepareResponse.ok) {
        setPortalStatus(
          prepareBody.error || "Unable to prepare your portal access.",
          "error"
        );
        return;
      }

      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: getMagicLinkRedirectUrl(),
        },
      });

      if (error) {
        if (isMagicLinkRateLimitMessage(error.message)) {
          startMagicLinkCooldown(form);
          setPortalStatus(
            formatMagicLinkRateLimitMessage(
              getStoredMagicLinkCooldownRemainingMs()
            ),
            "error"
          );
          return;
        }

        setPortalStatus(
          error.message || "Unable to send the magic link.",
          "error"
        );
        return;
      }

      startMagicLinkCooldown(form);
      setPortalStatus("Check your email for the magic link.", "success");
    } finally {
      magicLinkRequestInFlight = false;
      refreshMagicLinkButtonState(form);
    }
  });
}

function getMagicLinkRedirectUrl() {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`;
}

async function renderProjects(accessToken) {
  currentAccessToken = accessToken;
  const portalView = window.PortalView;
  const response = await fetch("/api/portal/actions?action=projects", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (!response.ok) {
    setPortalStatus(body.error || "Unable to load projects.", "error");
    return;
  }
  document.getElementById("portal-login").hidden = true;
  const container = document.getElementById("portal-projects");
  container.hidden = false;
  container.innerHTML = body.projects.length
    ? body.projects
        .map((project) =>
          portalView.renderProjectCard(
            portalView.buildPortalProjectView(project)
          )
        )
        .join("")
    : portalView.renderEmptyProjects();
  if (container.dataset.portalActionsBound !== "true") {
    bindProjectActions(container);
    container.dataset.portalActionsBound = "true";
  }
}

function bindProjectActions(container) {
  container.addEventListener("submit", async (event) => {
    event.preventDefault();
    const projectCard = event.target.closest(".portal-project");
    const projectId = projectCard?.dataset.projectId;
    if (!projectId) return;

    if (event.target.classList.contains("portal-link-form")) {
      const url = new FormData(event.target).get("url");
      try {
        await withPortalSubmitState(event.target, "Submitting...", async () => {
          await postPortalAction("/api/portal/actions?action=file-links", {
            projectId,
            url,
          });
          event.target.reset();
          setPortalStatus(getPortalActionSuccessMessage("fileLink"), "success");
          await renderProjects(currentAccessToken);
        });
      } catch (error) {
        setPortalStatus(
          error.message || "Unable to submit file link.",
          "error"
        );
      }
      return;
    }

    if (event.target.classList.contains("portal-revision-form")) {
      const notes = new FormData(event.target).get("notes");
      try {
        await withPortalSubmitState(event.target, "Submitting...", async () => {
          await postPortalAction("/api/portal/actions?action=revisions", {
            projectId,
            notes,
          });
          event.target.reset();
          setPortalStatus(getPortalActionSuccessMessage("revision"), "success");
          await renderProjects(currentAccessToken);
        });
      } catch (error) {
        setPortalStatus(
          error.message || "Unable to submit revision request.",
          "error"
        );
      }
      return;
    }
  });

  container.addEventListener("click", async (event) => {
    if (event.target.classList.contains("portal-pay-balance-button")) {
      const projectCard = event.target.closest(".portal-project");
      const projectId = projectCard?.dataset.projectId;
      if (!projectId) return;
      const originalLabel = setPortalButtonPending(event.target, "Opening...");
      try {
        const result = await postPortalAction(
          "/api/portal/actions?action=pay-balance",
          {
            projectId,
          }
        );
        if (result.approvalUrl) {
          window.open(result.approvalUrl, "_blank", "noopener,noreferrer");
          setPortalStatus(getPortalActionSuccessMessage("balance"), "success");
        } else {
          setPortalStatus("Balance checkout started.", "success");
        }
      } catch (error) {
        setPortalStatus(
          error.message || "Unable to start balance checkout.",
          "error"
        );
      } finally {
        restorePortalButton(event.target, originalLabel);
      }
      return;
    }

    if (event.target.classList.contains("portal-accept-quote-button")) {
      const projectCard = event.target.closest(".portal-project");
      const projectId = projectCard?.dataset.projectId;
      const quoteId = event.target.getAttribute("data-quote-id");
      if (!projectId || !quoteId) return;
      const originalLabel = setPortalButtonPending(event.target, "Opening...");
      try {
        const result = await postPortalAction(
          "/api/portal/actions?action=accept-quote",
          {
            projectId,
            quoteId,
          }
        );
        if (result.approvalUrl) {
          window.open(result.approvalUrl, "_blank", "noopener,noreferrer");
          setPortalStatus(getPortalActionSuccessMessage("quote"), "success");
        } else {
          setPortalStatus("Quote checkout started.", "success");
        }
      } catch (error) {
        setPortalStatus(
          error.message || "Unable to start quote checkout.",
          "error"
        );
      } finally {
        restorePortalButton(event.target, originalLabel);
      }
      return;
    }

    if (!event.target.classList.contains("portal-approve-button")) return;
    const projectCard = event.target.closest(".portal-project");
    const projectId = projectCard?.dataset.projectId;
    if (!projectId) return;
    const originalLabel = setPortalButtonPending(event.target, "Approving...");
    try {
      await postPortalAction("/api/portal/actions?action=approvals", {
        projectId,
      });
      setPortalStatus(getPortalActionSuccessMessage("approval"), "success");
      await renderProjects(currentAccessToken);
    } catch (error) {
      setPortalStatus(
        error.message || "Unable to approve final delivery.",
        "error"
      );
    } finally {
      restorePortalButton(event.target, originalLabel);
    }
  });
}

async function postPortalAction(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${currentAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Portal action failed.");
  return body;
}

function getPortalActionSuccessMessage(action) {
  return PORTAL_ACTION_SUCCESS_MESSAGES[action] || "Project action completed.";
}

async function withPortalSubmitState(form, pendingLabel, callback) {
  const submitButton = form.querySelector('button[type="submit"]');
  const originalLabel = setPortalButtonPending(submitButton, pendingLabel);
  try {
    return await callback();
  } finally {
    restorePortalButton(submitButton, originalLabel);
  }
}

function setPortalButtonPending(button, pendingLabel) {
  if (!button) return "";
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = pendingLabel;
  return originalLabel;
}

function restorePortalButton(button, originalLabel) {
  if (!button) return;
  button.disabled = false;
  if (originalLabel) button.textContent = originalLabel;
}

function setPortalStatus(message, tone = "info") {
  const status = document.getElementById("portal-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
  status.hidden = !message;
}

function isMagicLinkRateLimitMessage(message) {
  return /rate limit exceeded|over_email_send_rate_limit|security purposes.*request this after/i.test(
    String(message || "")
  );
}

function formatMagicLinkRateLimitMessage(remainingMs = MAGIC_LINK_COOLDOWN_MS) {
  const seconds = Math.max(1, Math.ceil(Number(remainingMs || 0) / 1000));
  return `A magic link was already sent recently. Check your email or wait about ${seconds} seconds before trying again.`;
}

function getMagicLinkCooldownRemainingMs(cooldownUntil, now = Date.now()) {
  return Math.max(0, Number(cooldownUntil || 0) - Number(now || 0));
}

function getPortalSessionStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch (_error) {
    return null;
  }
}

function readMagicLinkCooldownUntil(storage = getPortalSessionStorage()) {
  if (!storage || typeof storage.getItem !== "function") return 0;

  const rawValue = storage.getItem(MAGIC_LINK_STORAGE_KEY);
  const cooldownUntil = Number(rawValue || 0);
  return Number.isFinite(cooldownUntil) ? cooldownUntil : 0;
}

function writeMagicLinkCooldownUntil(
  cooldownUntil,
  storage = getPortalSessionStorage()
) {
  if (!storage || typeof storage.setItem !== "function") return;

  storage.setItem(MAGIC_LINK_STORAGE_KEY, String(Math.max(0, cooldownUntil)));
}

function getStoredMagicLinkCooldownRemainingMs(
  now = Date.now(),
  storage = getPortalSessionStorage()
) {
  const remainingMs = getMagicLinkCooldownRemainingMs(
    readMagicLinkCooldownUntil(storage),
    now
  );

  if (
    remainingMs === 0 &&
    storage &&
    typeof storage.removeItem === "function"
  ) {
    storage.removeItem(MAGIC_LINK_STORAGE_KEY);
  }

  return remainingMs;
}

function refreshMagicLinkButtonState(form) {
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!submitButton) return;

  const remainingMs = getStoredMagicLinkCooldownRemainingMs();
  if (magicLinkRequestInFlight) {
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    return;
  }

  if (remainingMs > 0) {
    submitButton.disabled = true;
    submitButton.textContent = `Resend in ${Math.ceil(remainingMs / 1000)}s`;
    return;
  }

  submitButton.disabled = false;
  submitButton.textContent = MAGIC_LINK_DEFAULT_LABEL;
}

function stopMagicLinkCooldown() {
  if (typeof window === "undefined" || !magicLinkCooldownTimer) return;

  window.clearInterval(magicLinkCooldownTimer);
  magicLinkCooldownTimer = null;
}

function startMagicLinkCooldown(
  form,
  cooldownUntil = Date.now() + MAGIC_LINK_COOLDOWN_MS
) {
  writeMagicLinkCooldownUntil(cooldownUntil);
  refreshMagicLinkButtonState(form);
  stopMagicLinkCooldown();

  if (typeof window === "undefined") return;

  magicLinkCooldownTimer = window.setInterval(() => {
    refreshMagicLinkButtonState(form);
    if (getStoredMagicLinkCooldownRemainingMs() === 0) {
      stopMagicLinkCooldown();
    }
  }, 1000);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  initPortal().catch((error) =>
    setPortalStatus(error.message || "Unable to load portal.")
  );
}

if (typeof module !== "undefined") {
  module.exports = {
    formatMagicLinkRateLimitMessage,
    getPortalActionSuccessMessage,
    getMagicLinkCooldownRemainingMs,
    isMagicLinkRateLimitMessage,
    readMagicLinkCooldownUntil,
    getStoredMagicLinkCooldownRemainingMs,
  };
}
