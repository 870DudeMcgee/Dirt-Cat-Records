(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PortalView = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STATUS_CONTENT = {
    awaiting_files: {
      label: 'Waiting For Files',
      nextStep: 'Upload your stems, rough mix, and references so Josh can start the project cleanly.',
    },
    files_submitted: {
      label: 'Files Submitted',
      nextStep: 'Your files are in. Josh will review them and update the project when work begins.',
    },
    reviewing: {
      label: 'In Review',
      nextStep: 'Josh is reviewing the project files and notes.',
    },
    mixing: {
      label: 'Mixing',
      nextStep: 'The mix is in progress. Watch this portal for revisions and delivery updates.',
    },
    revision_requested: {
      label: 'Revision Requested',
      nextStep: 'Your revision request was received. Josh will update the project after the revision pass.',
    },
    revision_in_progress: {
      label: 'Revision In Progress',
      nextStep: 'A revision pass is underway.',
    },
    finals_ready: {
      label: 'Finals Ready',
      nextStep: 'Final files are ready. Use the available delivery or balance action shown here.',
    },
    balance_due: {
      label: 'Balance Due',
      nextStep: 'Final files are ready but locked until the remaining balance is paid.',
    },
    delivered: {
      label: 'Delivered',
      nextStep: 'Review the final files. Approve them when the project is complete, or request a remaining revision.',
    },
    approved: {
      label: 'Approved',
      nextStep: 'Final delivery is approved. This project is ready to close.',
    },
    completed: {
      label: 'Completed',
      nextStep: 'This project is complete.',
    },
    closed: {
      label: 'Closed',
      nextStep: 'This project is closed.',
    },
  };

  function buildPortalProjectView(project = {}) {
    const balanceDue = Number(project.balance_due || 0);
    const statusContent = getStatusContent(project.status, balanceDue);
    const revisionLimit = Number(project.included_revisions || 0) + Number(project.extra_revisions_allowed || 0);
    const usedRevisions = Number(project.used_revisions || 0);
    const revisionsRemaining = Math.max(0, revisionLimit - usedRevisions);
    const finalDeliveryUrl = safeHttpUrl(project.final_delivery_url);
    const uploadFolderUrl = safeHttpUrl(project.drive_upload_folder_url);
    const finalUnlocked = Boolean(finalDeliveryUrl && project.final_delivery_locked === false);

    return {
      id: String(project.id || ''),
      title: project.project_title || project.artist_name || project.project_code || 'Untitled Project',
      projectCode: project.project_code || '',
      status: project.status || '',
      statusLabel: statusContent.label,
      nextStep: statusContent.nextStep,
      uploadFolderUrl,
      finalDeliveryUrl,
      finalUnlocked,
      balanceDue,
      balanceDueLabel: formatDollars(balanceDue),
      revisionsRemaining,
      revisionLabel: getRevisionLabel(revisionsRemaining),
      canSubmitFiles: [
        'awaiting_files',
        'files_submitted',
        'reviewing',
        'paid',
        'mixing',
        'revision_requested',
        'revision_in_progress',
      ].includes(project.status),
      canRequestRevision: revisionsRemaining > 0 && !['approved', 'completed', 'closed'].includes(project.status),
      canApproveFinal: finalUnlocked && ['finals_ready', 'delivered'].includes(project.status),
    };
  }

  function getStatusContent(status, balanceDue) {
    if (balanceDue > 0 && ['finals_ready', 'balance_due'].includes(status)) {
      return STATUS_CONTENT.balance_due;
    }
    return STATUS_CONTENT[status] || {
      label: titleCase(status || 'Project Active'),
      nextStep: 'Your project is active. Watch this portal for the next update.',
    };
  }

  function renderProjectCard(projectView) {
    const project = projectView.statusLabel ? projectView : buildPortalProjectView(projectView);
    return `
      <article class="portal-project" data-project-id="${escapeHtml(project.id)}">
        <header class="portal-project-header">
          <div>
            <p class="portal-status-pill">${escapeHtml(project.statusLabel)}</p>
            <h2>${escapeHtml(project.title)}</h2>
            ${project.projectCode ? `<p class="portal-project-code">${escapeHtml(project.projectCode)}</p>` : ''}
          </div>
          ${project.balanceDue > 0 ? `<div class="portal-balance"><span>Balance Due</span><strong>${escapeHtml(project.balanceDueLabel)}</strong></div>` : ''}
        </header>
        <p class="portal-next-step">${escapeHtml(project.nextStep)}</p>
        <p class="portal-revision-count">${escapeHtml(project.revisionLabel)}</p>
        <div class="portal-actions">
          ${project.uploadFolderUrl ? `<a class="btn" href="${escapeHtml(project.uploadFolderUrl)}" target="_blank" rel="noreferrer">Open Upload Folder</a>` : ''}
          ${project.finalUnlocked && project.finalDeliveryUrl ? `<a class="btn" href="${escapeHtml(project.finalDeliveryUrl)}" target="_blank" rel="noreferrer">Open Final Files</a>` : ''}
          ${project.canApproveFinal ? '<button class="btn portal-approve-button" type="button">Approve Final</button>' : ''}
        </div>
        ${project.canSubmitFiles ? renderFileLinkForm() : ''}
        ${project.canRequestRevision ? renderRevisionForm() : ''}
      </article>
    `;
  }

  function renderFileLinkForm() {
    return `
      <form class="portal-link-form">
        <label>
          <span>File Link</span>
          <input type="url" name="url" placeholder="Paste Drive, Dropbox, or WeTransfer link" required>
        </label>
        <button class="btn" type="submit">Submit Link</button>
      </form>
    `;
  }

  function renderRevisionForm() {
    return `
      <form class="portal-revision-form">
        <label>
          <span>Revision Notes</span>
          <textarea name="notes" placeholder="What should change in the mix?" required></textarea>
        </label>
        <button class="btn" type="submit">Request Revision</button>
      </form>
    `;
  }

  function renderEmptyProjects() {
    return `
      <article class="portal-empty-state">
        <h2>No projects found for this email.</h2>
        <p>If you just paid or requested a free review, watch your email for the project portal link and upload instructions.</p>
      </article>
    `;
  }

  function getRevisionLabel(revisionsRemaining) {
    if (revisionsRemaining === 1) return '1 revision remaining';
    if (revisionsRemaining > 1) return `${revisionsRemaining} revisions remaining`;
    return 'No included revisions remain';
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

  function formatDollars(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
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

  return {
    buildPortalProjectView,
    renderEmptyProjects,
    renderProjectCard,
    safeHttpUrl,
  };
}));
