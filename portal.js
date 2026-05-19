let supabaseClient;
let currentAccessToken;
const PRODUCTION_ORIGIN = "https://dirtcatrecords.com";
const portalView = window.PortalView;

async function initPortal() {
  const configResponse = await fetch("/api/public/config");
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
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = new FormData(form).get("email");
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getMagicLinkRedirectUrl() },
    });
    setPortalStatus(
      error ? error.message : "Check your email for the magic link."
    );
  });
}

function getMagicLinkRedirectUrl() {
  const { hostname, origin, pathname } = window.location;
  if (/\.vercel\.app$/i.test(hostname)) {
    return `${PRODUCTION_ORIGIN}${pathname}`;
  }
  return `${origin}${pathname}`;
}

async function renderProjects(accessToken) {
  currentAccessToken = accessToken;
  const response = await fetch("/api/portal/actions?action=projects", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (!response.ok) {
    setPortalStatus(body.error || "Unable to load projects.");
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
  bindProjectActions(container);
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
        await postPortalAction("/api/portal/actions?action=file-links", {
          projectId,
          url,
        });
        event.target.reset();
        setPortalStatus("File link submitted.");
      } catch (error) {
        setPortalStatus(error.message || "Unable to submit file link.");
      }
    }

    if (event.target.classList.contains("portal-revision-form")) {
      const notes = new FormData(event.target).get("notes");
      try {
        await postPortalAction("/api/portal/actions?action=revisions", {
          projectId,
          notes,
        });
        event.target.reset();
        setPortalStatus("Revision request submitted.");
      } catch (error) {
        setPortalStatus(error.message || "Unable to submit revision request.");
      }
    }
  });

  container.addEventListener("click", async (event) => {
    if (event.target.classList.contains("portal-pay-balance-button")) {
      const projectCard = event.target.closest(".portal-project");
      const projectId = projectCard?.dataset.projectId;
      if (!projectId) return;
      try {
        const result = await postPortalAction("/api/portal/pay-balance", {
          projectId,
        });
        if (result.approvalUrl) {
          window.open(result.approvalUrl, "_blank", "noopener,noreferrer");
          setPortalStatus("Balance checkout opened in a new tab.");
        } else {
          setPortalStatus("Balance checkout started.");
        }
      } catch (error) {
        setPortalStatus(error.message || "Unable to start balance checkout.");
      }
      return;
    }

    if (event.target.classList.contains("portal-accept-quote-button")) {
      const projectCard = event.target.closest(".portal-project");
      const projectId = projectCard?.dataset.projectId;
      const quoteId = event.target.getAttribute("data-quote-id");
      if (!projectId || !quoteId) return;
      try {
        const result = await postPortalAction("/api/portal/accept-quote", {
          projectId,
          quoteId,
        });
        if (result.approvalUrl) {
          window.open(result.approvalUrl, "_blank", "noopener,noreferrer");
          setPortalStatus("Quote checkout opened in a new tab.");
        } else {
          setPortalStatus("Quote checkout started.");
        }
      } catch (error) {
        setPortalStatus(error.message || "Unable to start quote checkout.");
      }
      return;
    }

    if (!event.target.classList.contains("portal-approve-button")) return;
    const projectCard = event.target.closest(".portal-project");
    const projectId = projectCard?.dataset.projectId;
    if (!projectId) return;
    try {
      await postPortalAction("/api/portal/actions?action=approvals", {
        projectId,
      });
      setPortalStatus("Final approved.");
    } catch (error) {
      setPortalStatus(error.message || "Unable to approve final delivery.");
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

function setPortalStatus(message) {
  document.getElementById("portal-status").textContent = message;
}

initPortal().catch((error) =>
  setPortalStatus(error.message || "Unable to load portal.")
);
