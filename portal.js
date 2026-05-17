let supabaseClient;

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
}

function renderProjectCard(project) {
  return `
    <article class="portal-project">
      <h2>${escapeHtml(project.project_title || 'Untitled Project')}</h2>
      <p>Status: ${escapeHtml(project.status)}</p>
      ${project.drive_upload_folder_url ? `<a class="btn" href="${escapeHtml(project.drive_upload_folder_url)}" target="_blank" rel="noreferrer">Open Upload Folder</a>` : ''}
    </article>
  `;
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
