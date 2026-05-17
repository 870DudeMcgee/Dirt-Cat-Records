let supabaseClient;
let currentAccessToken;

async function initPortal() {
  const configResponse = await fetch('/api/public/config');
  const config = await configResponse.json();
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublicKey);

  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    await renderProjects(data.session.access_token);
  }

  const form = document.getElementById('magic-link-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = new FormData(form).get('email');
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setPortalStatus(error ? error.message : 'Check your email for the magic link.');
  });
}

async function renderProjects(accessToken) {
  currentAccessToken = accessToken;
  const response = await fetch('/api/portal/projects', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (!response.ok) {
    setPortalStatus(body.error || 'Unable to load projects.');
    return;
  }
  document.getElementById('portal-login').hidden = true;
  const container = document.getElementById('portal-projects');
  container.hidden = false;
  container.innerHTML = body.projects.map(renderProjectCard).join('');
  bindProjectActions(container);
}

function renderProjectCard(project) {
  const finalUnlocked = project.final_delivery_url && project.final_delivery_locked === false;
  const uploadFolderUrl = safeHttpUrl(project.drive_upload_folder_url);
  const finalDeliveryUrl = safeHttpUrl(project.final_delivery_url);
  return `
    <article class="portal-project" data-project-id="${escapeHtml(project.id)}">
      <h2>${escapeHtml(project.project_title || 'Untitled Project')}</h2>
      <p>Status: ${escapeHtml(project.status)}</p>
      ${uploadFolderUrl ? `<a class="btn" href="${escapeHtml(uploadFolderUrl)}" target="_blank" rel="noreferrer">Open Upload Folder</a>` : ''}
      <form class="portal-link-form">
        <input type="url" name="url" placeholder="Paste Drive, Dropbox, or WeTransfer link" required>
        <button class="btn" type="submit">Submit Link</button>
      </form>
      <form class="portal-revision-form">
        <textarea name="notes" placeholder="Revision notes"></textarea>
        <button class="btn" type="submit">Request Revision</button>
      </form>
      ${finalUnlocked && finalDeliveryUrl ? `<a class="btn" href="${escapeHtml(finalDeliveryUrl)}" target="_blank" rel="noreferrer">Open Final Files</a>` : ''}
      <button class="btn portal-approve-button" type="button">Approve Final</button>
    </article>
  `;
}

function safeHttpUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch (_error) {
    return null;
  }
}

function bindProjectActions(container) {
  container.addEventListener('submit', async (event) => {
    event.preventDefault();
    const projectCard = event.target.closest('.portal-project');
    const projectId = projectCard?.dataset.projectId;
    if (!projectId) return;

    if (event.target.classList.contains('portal-link-form')) {
      const url = new FormData(event.target).get('url');
      await postPortalAction('/api/portal/file-links', { projectId, url });
      event.target.reset();
      setPortalStatus('File link submitted.');
    }

    if (event.target.classList.contains('portal-revision-form')) {
      const notes = new FormData(event.target).get('notes');
      await postPortalAction('/api/portal/revisions', { projectId, notes });
      event.target.reset();
      setPortalStatus('Revision request submitted.');
    }
  });

  container.addEventListener('click', async (event) => {
    if (!event.target.classList.contains('portal-approve-button')) return;
    const projectCard = event.target.closest('.portal-project');
    const projectId = projectCard?.dataset.projectId;
    if (!projectId) return;
    await postPortalAction('/api/portal/approvals', { projectId });
    setPortalStatus('Final approved.');
  });
}

async function postPortalAction(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${currentAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Portal action failed.');
  return body;
}

function setPortalStatus(message) {
  document.getElementById('portal-status').textContent = message;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

initPortal().catch((error) => setPortalStatus(error.message || 'Unable to load portal.'));
