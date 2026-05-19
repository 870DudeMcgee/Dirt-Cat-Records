(function () {
  let supabaseClient = null;
  let accessToken = null;
  let latestRunId = window.localStorage.getItem('dcr_latest_test_run_id') || null;
  const PRODUCTION_ORIGIN = 'https://dirtcatrecords.com';

  document.addEventListener('DOMContentLoaded', initAdmin);

  async function initAdmin() {
    bindActions();
    try {
      await initAuth();
      await loadOverview();
      await loadSetup();
      await loadRuns();
    } catch (error) {
      setStatus(error.message || 'Unable to initialize admin setup.');
      renderOverview(emptyOverview());
      renderSetup({ sections: {} });
    }
  }

  function bindActions() {
    document.getElementById('admin-refresh')?.addEventListener('click', refreshAdmin);
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

  async function refreshAdmin() {
    await loadOverview();
    await loadSetup();
    await loadRuns();
  }

  async function sendMagicLink(event) {
    event.preventDefault();
    const email = new FormData(event.target).get('email');
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getMagicLinkRedirectUrl() },
    });
    setStatus(error ? error.message : 'Check your email for the admin magic link.');
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
      const data = await api('/api/admin/setup-wizard?action=setup');
      setStatus('');
      renderSetup(data.setup);
    } catch (error) {
      setStatus(error.message || 'Unable to load setup status.');
      renderSetup({ sections: {} });
    }
  }

  async function loadOverview() {
    try {
      const data = await api('/api/admin/overview');
      renderOverview(data.overview || emptyOverview());
    } catch (error) {
      setStatus(error.message || 'Unable to load admin overview.');
      renderOverview(emptyOverview());
    }
  }

  async function loadRuns() {
    try {
      const data = await api('/api/admin/setup-wizard?action=test-runs');
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
      const data = await api('/api/admin/setup-wizard?action=test-runs', {
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
      const data = await api('/api/admin/setup-wizard?action=cleanup', {
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

  function renderOverview(overview) {
    renderOverviewMetrics(overview.metrics || []);
    renderOverviewQueue(overview.queues || {});
    renderOverviewEvents(overview.recentEvents || []);

    const updated = document.getElementById('overview-updated');
    if (updated) updated.textContent = overview.generatedAt ? `Updated ${formatDateTime(overview.generatedAt)}` : '';
  }

  function renderOverviewMetrics(metrics) {
    const container = document.getElementById('overview-metrics');
    if (!container) return;
    container.innerHTML = metrics.map((metric) => `
      <article class="overview-metric">
        <span>${escapeHtml(metric.label)}</span>
        <strong>${escapeHtml(metric.count)}</strong>
      </article>
    `).join('');
  }

  function renderOverviewQueue(queues) {
    const container = document.getElementById('overview-queue');
    if (!container) return;
    const items = [
      ...(queues.newLeads || []).map((lead) => ({
        label: 'New Lead',
        title: lead.projectTitle || lead.artistName || lead.email || 'Untitled lead',
        detail: lead.email,
        time: lead.createdAt,
      })),
      ...(queues.awaitingFiles || []).map((project) => projectQueueItem('Awaiting Files', project)),
      ...(queues.filesSubmitted || []).map((project) => projectQueueItem('Files Submitted', project)),
      ...(queues.revisionRequests || []).map((revision) => ({
        label: 'Revision',
        title: revision.projectTitle || revision.artistName || revision.projectCode || 'Revision request',
        detail: revision.notes,
        time: revision.createdAt,
      })),
      ...(queues.finalsReady || []).map((project) => projectQueueItem('Finals Ready', project)),
      ...(queues.balancesDue || []).map((project) => ({
        ...projectQueueItem('Balance Due', project),
        detail: `${project.balanceDueLabel} remaining`,
      })),
    ].slice(0, 12);

    container.innerHTML = items.length ? items.map(renderOverviewItem).join('') : '<p class="overview-empty">No priority items.</p>';
  }

  function renderOverviewEvents(events) {
    const container = document.getElementById('overview-events');
    if (!container) return;
    container.innerHTML = events.length ? events.slice(0, 12).map((event) => renderOverviewItem({
      label: titleCase(event.eventType || 'Event'),
      title: event.message || event.projectId || 'Project event',
      detail: event.actorType ? `By ${titleCase(event.actorType)}` : '',
      time: event.createdAt,
    })).join('') : '<p class="overview-empty">No recent activity.</p>';
  }

  function projectQueueItem(label, project) {
    return {
      label,
      title: project.title || project.projectTitle || project.artistName || project.projectCode || 'Untitled project',
      detail: project.projectCode || project.statusLabel || '',
      time: project.updatedAt || project.createdAt,
      href: safeHttpUrl(project.driveProjectFolderUrl || project.driveUploadFolderUrl || project.driveFinalsFolderUrl || project.finalDeliveryUrl),
    };
  }

  function renderOverviewItem(item) {
    const action = item.href ? `<a href="${escapeHtml(item.href)}" target="_blank" rel="noreferrer">Open</a>` : '';
    return `
      <article class="overview-item">
        <div>
          <p>${escapeHtml(item.label)}</p>
          <h4>${escapeHtml(item.title)}</h4>
          ${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ''}
        </div>
        <div class="overview-item-meta">
          ${item.time ? `<time datetime="${escapeHtml(item.time)}">${escapeHtml(formatDateTime(item.time))}</time>` : ''}
          ${action}
        </div>
      </article>
    `;
  }

  function emptyOverview() {
    const metrics = [
      ['newLeads', 'New Leads'],
      ['awaitingFiles', 'Awaiting Files'],
      ['filesSubmitted', 'Files Submitted'],
      ['activeProjects', 'Active Projects'],
      ['revisionRequests', 'Revision Requests'],
      ['finalsReady', 'Finals Ready'],
      ['balancesDue', 'Balances Due'],
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
    return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  function safeHttpUrl(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
    } catch (_error) {
      return '';
    }
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
