(function () {
  let supabaseClient = null;
  let accessToken = null;
  let latestRunId = window.localStorage.getItem('dcr_latest_test_run_id') || null;

  document.addEventListener('DOMContentLoaded', initAdmin);

  async function initAdmin() {
    bindActions();
    await initAuth();
    await loadSetup();
    await loadRuns();
  }

  function bindActions() {
    document.getElementById('admin-refresh')?.addEventListener('click', loadSetup);
    document.getElementById('run-simulation')?.addEventListener('click', () => runTest('simulation'));
    document.getElementById('run-sandbox')?.addEventListener('click', () => runTest('sandbox'));
    document.getElementById('cleanup-run')?.addEventListener('click', cleanupRun);
    document.getElementById('admin-magic-link-form')?.addEventListener('submit', sendMagicLink);
  }

  async function initAuth() {
    const configResponse = await fetch('/api/public/config');
    const config = await configResponse.json();
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublicKey);
    const { data } = await supabaseClient.auth.getSession();
    accessToken = data.session?.access_token || '';
    document.getElementById('cleanup-run').disabled = !latestRunId;
  }

  async function sendMagicLink(event) {
    event.preventDefault();
    const email = new FormData(event.target).get('email');
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setStatus(error ? error.message : 'Check your email for the admin magic link.');
  }

  async function loadSetup() {
    try {
      const data = await api('/api/admin/setup');
      setStatus('');
      renderSetup(data.setup);
    } catch (error) {
      setStatus(error.message || 'Unable to load setup status.');
      renderSetup({ sections: {} });
    }
  }

  async function loadRuns() {
    try {
      const data = await api('/api/admin/test-runs');
      const latestRun = data.runs?.[0];
      if (!latestRun) return;
      latestRunId = latestRun.id;
      window.localStorage.setItem('dcr_latest_test_run_id', latestRunId);
      document.getElementById('cleanup-run').disabled = false;
      renderReport(latestRun.report);
    } catch (_error) {
      document.getElementById('cleanup-run').disabled = !latestRunId;
    }
  }

  async function runTest(mode) {
    renderReport({ status: 'running', steps: [{ label: `Running ${mode}`, status: 'running' }] });
    try {
      const data = await api('/api/admin/test-runs', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      latestRunId = data.id;
      window.localStorage.setItem('dcr_latest_test_run_id', latestRunId);
      document.getElementById('cleanup-run').disabled = !latestRunId;
      renderReport(data.report);
    } catch (error) {
      renderReport({ status: 'failed', steps: [{ label: `Run ${mode}`, status: 'failed', error: error.message }] });
    }
  }

  async function cleanupRun() {
    if (!latestRunId) return;
    try {
      const data = await api('/api/admin/cleanup-test-run', {
        method: 'POST',
        body: JSON.stringify({ testRunId: latestRunId }),
      });
      renderReport(data.report);
    } catch (error) {
      renderReport({ status: 'failed', steps: [{ label: 'Clean up test data', status: 'failed', error: error.message }] });
    }
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Admin request failed.');
    return body;
  }

  function renderSetup(setup) {
    const container = document.getElementById('setup-sections');
    if (!container) return;
    container.innerHTML = Object.entries(setup.sections || {}).map(([key, section]) => `
      <article class="setup-card setup-card-${section.status}">
        <h2>${escapeHtml(titleCase(key))}</h2>
        <p>${escapeHtml(section.provider?.detail || section.provider?.error || section.status)}</p>
        <dl>
          ${Object.entries(section.requiredEnv || {}).map(([envKey, value]) => `
            <div><dt>${escapeHtml(envKey)}</dt><dd>${value.present ? 'Present' : 'Missing'}</dd></div>
          `).join('')}
        </dl>
      </article>
    `).join('');
  }

  function renderReport(report) {
    const container = document.getElementById('test-report');
    if (!container) return;
    container.innerHTML = `
      <div class="report-status report-status-${escapeHtml(report.status || 'unknown')}">${escapeHtml(report.status || 'unknown')}</div>
      <ol class="report-steps">
        ${(report.steps || []).map((step) => `
          <li class="report-step report-step-${escapeHtml(step.status)}">
            <strong>${escapeHtml(step.label || step.key)}</strong>
            <span>${escapeHtml(step.detail || step.error || step.status)}</span>
          </li>
        `).join('')}
      </ol>
    `;
  }

  function titleCase(value) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function setStatus(message) {
    const status = document.getElementById('admin-status');
    if (status) status.textContent = message || '';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }
}());
