(function () {
  let accessToken = null;
  let latestRunId = null;

  document.addEventListener('DOMContentLoaded', initAdmin);

  async function initAdmin() {
    bindActions();
    accessToken = window.localStorage.getItem('dcr_portal_access_token') || '';
    await loadSetup();
  }

  function bindActions() {
    document.getElementById('admin-refresh')?.addEventListener('click', loadSetup);
    document.getElementById('run-simulation')?.addEventListener('click', () => runTest('simulation'));
    document.getElementById('run-sandbox')?.addEventListener('click', () => runTest('sandbox'));
    document.getElementById('cleanup-run')?.addEventListener('click', cleanupRun);
  }

  async function loadSetup() {
    const data = await api('/api/admin/setup');
    renderSetup(data.setup);
  }

  async function runTest(mode) {
    renderReport({ status: 'running', steps: [{ label: `Running ${mode}`, status: 'running' }] });
    const data = await api('/api/admin/test-runs', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
    latestRunId = data.id;
    document.getElementById('cleanup-run').disabled = !latestRunId;
    renderReport(data.report);
  }

  async function cleanupRun() {
    if (!latestRunId) return;
    const data = await api('/api/admin/cleanup-test-run', {
      method: 'POST',
      body: JSON.stringify({ testRunId: latestRunId }),
    });
    renderReport(data.report);
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
