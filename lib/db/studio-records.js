const { randomInt } = require('node:crypto');

function getSupabaseConfig(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ''), supabaseKey };
}

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig(options.env);
  const fetchImpl = options.fetchImpl || fetch;
  const url = new URL(`${supabaseUrl}/rest/v1${path}`);
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    Prefer: options.prefer || 'return=representation',
  };

  const response = await fetchImpl(url, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await parseResponseBody(response);
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status} ${body.message || JSON.stringify(body)}`);
  return Array.isArray(body) ? body : [body];
}

async function upsertCustomer(input, options = {}) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error('A valid customer email is required.');
  const body = { email };
  if (input.name && typeof input.name === 'string' && input.name.trim()) {
    body.name = input.name.trim();
  }
  const rows = await supabaseRequest('/customers', {
    method: 'POST',
    query: { on_conflict: 'email', select: 'id,email,name,auth_user_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body,
    ...options,
  });
  if (!rows[0]?.id) throw new Error('Supabase did not return a customer id.');
  return rows[0];
}

async function getCustomerByEmail(email, options = {}) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('A valid customer email is required.');
  const rows = await supabaseRequest('/customers', {
    query: { email: `eq.${normalized}`, select: 'id,email,name,auth_user_id' },
    ...options,
  });
  return rows[0] || null;
}

async function createProjectEvent(event, options = {}) {
  const rows = await supabaseRequest('/project_events', {
    method: 'POST',
    query: { select: 'id,project_id,event_type' },
    body: {
      project_id: requireValue(event.projectId, 'project id'),
      event_type: requireValue(event.eventType, 'event type'),
      actor_type: requireValue(event.actorType, 'actor type'),
      message: requireValue(event.message, 'event message'),
      metadata: event.metadata || {},
    },
    ...options,
  });
  return rows[0];
}

async function createLead(input, options = {}) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error('A valid lead email is required.');
  const rows = await supabaseRequest('/leads', {
    method: 'POST',
    query: { select: 'id,customer_id,status' },
    body: {
      customer_id: requireValue(input.customerId, 'customer id'),
      email,
      artist_name: input.artistName || null,
      project_title: input.projectTitle || null,
      message: input.message || null,
      reference_links: input.referenceLinks || [],
      status: 'new',
    },
    ...options,
  });
  return rows[0];
}

async function createProject(input, options = {}) {
  const body = {
    customer_id: requireValue(input.customerId, 'customer id'),
    order_id: input.orderId || null,
    lead_id: input.leadId || null,
    project_type: requireValue(input.projectType, 'project type'),
    status: requireValue(input.status, 'project status'),
    artist_name: input.artistName || null,
    project_title: input.projectTitle || null,
    service_id: input.serviceId || null,
    song_count: input.songCount || 1,
    total_amount: normalizeAmount(input.totalAmount || 0),
    amount_paid: normalizeAmount(input.amountPaid || 0),
    balance_due: normalizeAmount(input.balanceDue || 0),
    final_delivery_locked: input.finalDeliveryLocked !== false,
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const rows = await supabaseRequest('/projects', {
        method: 'POST',
        query: { select: '*' },
        body: { ...body, project_code: buildProjectCode(randomInt(1, 1000000)) },
        ...options,
      });
      return rows[0];
    } catch (error) {
      if (!/projects_project_code|duplicate key|unique/i.test(error.message || '') || attempt === 2) throw error;
    }
  }
  throw new Error('Unable to create a unique project code.');
}

async function updateProject(projectId, patch, options = {}) {
  const rows = await supabaseRequest('/projects', {
    method: 'PATCH',
    query: { id: `eq.${requireValue(projectId, 'project id')}`, select: '*' },
    body: patch,
    ...options,
  });
  return rows[0];
}

async function getProjectForCustomer(projectId, customerId, options = {}) {
  const rows = await supabaseRequest('/projects', {
    query: {
      id: `eq.${requireValue(projectId, 'project id')}`,
      customer_id: `eq.${requireValue(customerId, 'customer id')}`,
      select: '*',
    },
    ...options,
  });
  return rows[0] || null;
}

async function createProjectFile(input, options = {}) {
  const rows = await supabaseRequest('/project_files', {
    method: 'POST',
    query: { select: 'id,project_id,upload_link,status' },
    body: {
      project_id: requireValue(input.projectId, 'project id'),
      order_id: input.orderId || null,
      upload_link: requireValue(input.uploadLink, 'upload link'),
      status: input.status || 'submitted',
    },
    ...options,
  });
  return rows[0];
}

async function createRevisionRequest(input, options = {}) {
  const rows = await supabaseRequest('/revision_requests', {
    method: 'POST',
    query: { select: 'id,project_id,status' },
    body: {
      project_id: requireValue(input.projectId, 'project id'),
      customer_id: requireValue(input.customerId, 'customer id'),
      notes: requireValue(input.notes, 'revision notes'),
      reference_links: input.referenceLinks || [],
      is_extra_revision: Boolean(input.isExtraRevision),
    },
    ...options,
  });
  return rows[0];
}

async function upsertPaymentAndOrder(input, options = {}) {
  const customer = requireValue(input.customer, 'customer');
  const payment = requireValue(input.payment, 'payment');
  const totalAmount = normalizeAmount(payment.totalAmount);
  const paymentAmount = normalizeAmount(payment.amountDueNow || payment.totalAmount);
  const orderRows = await supabaseRequest('/orders', {
    method: 'POST',
    query: { on_conflict: 'paypal_txn_id', select: 'id,customer_id,project_id,paypal_txn_id,status,total_amount' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      customer_id: customer.id,
      paypal_txn_id: requireValue(payment.paypalTxnId, 'PayPal transaction id'),
      paypal_order_id: payment.paypalOrderId || null,
      status: payment.status || 'paid',
      total_amount: totalAmount,
      payment_mode: payment.orderSummary?.paymentMode || 'full',
      amount_due_now: paymentAmount,
      remaining_balance: normalizeAmount(payment.remainingBalance || 0),
      order_summary: payment.orderSummary || {},
    },
    ...options,
  });
  const order = orderRows[0];
  if (!order?.id) throw new Error('Supabase did not return an order id.');

  const paymentRows = await supabaseRequest('/payments', {
    method: 'POST',
    query: { on_conflict: 'paypal_capture_id', select: 'id,project_id,order_id,paypal_capture_id,status,amount' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      customer_id: customer.id,
      order_id: order.id,
      paypal_order_id: payment.paypalOrderId || null,
      paypal_capture_id: requireValue(payment.paypalTxnId, 'PayPal transaction id'),
      payment_purpose: payment.paymentPurpose || 'checkout',
      status: payment.status || 'paid',
      amount: paymentAmount,
      currency: payment.currency || 'USD',
      raw_payload: payment.rawPayload || {},
    },
    ...options,
  });
  const paymentRecord = paymentRows[0];
  if (!paymentRecord?.id) throw new Error('Supabase did not return a payment id.');
  return { order, payment: paymentRecord };
}

async function getProjectById(projectId, options = {}) {
  const rows = await supabaseRequest('/projects', {
    query: { id: `eq.${requireValue(projectId, 'project id')}`, select: '*' },
    ...options,
  });
  return rows[0] || null;
}

async function getProjectByOrderId(orderId, options = {}) {
  const rows = await supabaseRequest('/projects', {
    query: { order_id: `eq.${requireValue(orderId, 'order id')}`, select: '*', limit: '1' },
    ...options,
  });
  return rows[0] || null;
}

async function linkOrderPaymentToProject({ orderId, paymentId, projectId }, options = {}) {
  if (orderId) {
    await supabaseRequest('/orders', {
      method: 'PATCH',
      query: { id: `eq.${orderId}`, select: 'id,project_id' },
      body: { project_id: projectId },
      ...options,
    });
  }
  if (paymentId) {
    await supabaseRequest('/payments', {
      method: 'PATCH',
      query: { id: `eq.${paymentId}`, select: 'id,project_id' },
      body: { project_id: projectId },
      ...options,
    });
  }
}

async function createEmailEvent(event, options = {}) {
  const rows = await supabaseRequest('/email_events', {
    method: 'POST',
    query: { select: 'id,email_type,status' },
    body: {
      project_id: event.projectId || null,
      customer_id: event.customerId || null,
      email_type: requireValue(event.emailType, 'email type'),
      recipient: requireValue(event.recipient, 'email recipient'),
      status: requireValue(event.status, 'email status'),
      resend_message_id: event.resendMessageId || null,
      error_message: event.errorMessage || null,
      metadata: event.metadata || {},
    },
    ...options,
  });
  return rows[0];
}

async function createAutomationTestRun(input, options = {}) {
  const rows = await supabaseRequest('/automation_test_runs', {
    method: 'POST',
    query: { select: '*' },
    body: {
      id: requireValue(input.id, 'test run id'),
      mode: requireValue(input.mode, 'test run mode'),
      status: requireValue(input.status, 'test run status'),
      business_name: requireValue(input.businessName, 'business name'),
      report: input.report || {},
      cleanup_status: input.cleanupStatus || 'not_requested',
      started_at: input.startedAt || new Date().toISOString(),
      finished_at: input.finishedAt || null,
    },
    ...options,
  });
  return rows[0];
}

async function updateAutomationTestRun(testRunId, patch, options = {}) {
  const body = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.report !== undefined) body.report = patch.report;
  if (patch.cleanupStatus !== undefined) body.cleanup_status = patch.cleanupStatus;
  if (patch.finishedAt !== undefined) body.finished_at = patch.finishedAt;
  body.updated_at = new Date().toISOString();

  const rows = await supabaseRequest('/automation_test_runs', {
    method: 'PATCH',
    query: { id: `eq.${requireValue(testRunId, 'test run id')}`, select: '*' },
    body,
    ...options,
  });
  return rows[0];
}

async function getAutomationTestRun(testRunId, options = {}) {
  const rows = await supabaseRequest('/automation_test_runs', {
    query: { id: `eq.${requireValue(testRunId, 'test run id')}`, select: '*', limit: '1' },
    ...options,
  });
  return rows[0] || null;
}

async function listAutomationTestRuns(options = {}) {
  return supabaseRequest('/automation_test_runs', {
    query: { select: '*', order: 'started_at.desc', limit: options.limit || '20' },
    ...options,
  });
}

async function getAdminOverview(options = {}) {
  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };
  const [leads, projects, revisions, events] = await Promise.all([
    supabaseRequest('/leads', {
      query: {
        select: 'id,status,email,artist_name,project_title,source,created_at,updated_at',
        order: 'created_at.desc',
        limit: options.leadLimit || '50',
      },
      ...queryOptions,
    }),
    supabaseRequest('/projects', {
      query: {
        select: 'id,project_code,project_type,status,artist_name,project_title,balance_due,amount_paid,total_amount,drive_project_folder_url,drive_upload_folder_url,drive_finals_folder_url,final_delivery_url,created_at,updated_at',
        order: 'updated_at.desc',
        limit: options.projectLimit || '100',
      },
      ...queryOptions,
    }),
    supabaseRequest('/revision_requests', {
      query: {
        select: 'id,project_id,status,notes,is_extra_revision,created_at,resolved_at,projects(project_code,project_title,artist_name,status)',
        order: 'created_at.desc',
        limit: options.revisionLimit || '50',
      },
      ...queryOptions,
    }),
    supabaseRequest('/project_events', {
      query: {
        select: 'id,project_id,event_type,actor_type,message,metadata,created_at',
        order: 'created_at.desc',
        limit: options.eventLimit || '20',
      },
      ...queryOptions,
    }),
  ]);

  return buildAdminOverview({ leads, projects, revisions, events });
}

async function getAdminProjectDetail(projectId, options = {}) {
  const id = requireValue(projectId, 'project id');
  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };
  const projects = await supabaseRequest('/projects', {
    query: {
      id: `eq.${id}`,
      select: '*,customers(id,email,name)',
      limit: '1',
    },
    ...queryOptions,
  });
  const project = projects[0];
  if (!project) return null;

  const fileQuery = project.order_id
    ? { or: `(project_id.eq.${id},order_id.eq.${project.order_id})`, select: '*', order: 'created_at.desc' }
    : { project_id: `eq.${id}`, select: '*', order: 'created_at.desc' };

  const [files, revisions, payments, events, emailEvents, adminNotes] = await Promise.all([
    supabaseRequest('/project_files', {
      query: fileQuery,
      ...queryOptions,
    }),
    supabaseRequest('/revision_requests', {
      query: { project_id: `eq.${id}`, select: '*', order: 'created_at.desc' },
      ...queryOptions,
    }),
    supabaseRequest('/payments', {
      query: { project_id: `eq.${id}`, select: '*', order: 'created_at.desc' },
      ...queryOptions,
    }),
    supabaseRequest('/project_events', {
      query: { project_id: `eq.${id}`, select: '*', order: 'created_at.desc' },
      ...queryOptions,
    }),
    supabaseRequest('/email_events', {
      query: { project_id: `eq.${id}`, select: '*', order: 'created_at.desc' },
      ...queryOptions,
    }),
    supabaseRequest('/admin_notes', {
      query: { project_id: `eq.${id}`, select: '*', order: 'created_at.desc' },
      ...queryOptions,
    }),
  ]);

  return buildAdminProjectDetail({ project, files, revisions, payments, events, emailEvents, adminNotes });
}

async function updateAdminProjectStatus(projectId, status, options = {}) {
  const id = requireValue(projectId, 'project id');
  const nextStatus = requireValue(status, 'status');
  if (!ADMIN_PROJECT_STATUSES.has(nextStatus)) {
    const error = new Error('Unsupported project status.');
    error.statusCode = 400;
    throw error;
  }

  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const project = await getProjectById(id, queryOptions);
  if (!project) return null;

  if (project.status !== nextStatus) {
    await updateProject(id, { status: nextStatus }, queryOptions);
    await createProjectEvent({
      projectId: id,
      eventType: 'admin_status_updated',
      actorType: 'admin',
      message: `Project status changed from ${titleCase(project.status)} to ${titleCase(nextStatus)}.`,
      metadata: {
        fromStatus: project.status,
        toStatus: nextStatus,
        adminEmail: options.adminEmail || '',
      },
    }, queryOptions);
  }

  return getAdminProjectDetail(id, queryOptions);
}

async function addAdminProjectNote(projectId, note, options = {}) {
  const id = requireValue(projectId, 'project id');
  const noteText = typeof note === 'string' ? note.trim() : '';
  if (!noteText) {
    const error = new Error('admin note is required.');
    error.statusCode = 400;
    throw error;
  }

  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const project = await getProjectById(id, queryOptions);
  if (!project) return null;

  await supabaseRequest('/admin_notes', {
    method: 'POST',
    query: { select: '*' },
    body: {
      project_id: id,
      note: noteText,
    },
    ...queryOptions,
  });

  await createProjectEvent({
    projectId: id,
    eventType: 'admin_note_added',
    actorType: 'admin',
    message: 'Admin note added.',
    metadata: {
      adminEmail: options.adminEmail || '',
    },
  }, queryOptions);

  return getAdminProjectDetail(id, queryOptions);
}

async function updateAdminProjectDelivery(projectId, update = {}, options = {}) {
  const id = requireValue(projectId, 'project id');
  const finalDeliveryUrl = normalizeOptionalHttpUrl(update.finalDeliveryUrl);
  const unlockDelivery = Boolean(update.unlockDelivery);
  if (!finalDeliveryUrl && !unlockDelivery) {
    const error = new Error('A valid final delivery URL is required.');
    error.statusCode = 400;
    throw error;
  }

  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const project = await getProjectById(id, queryOptions);
  if (!project) return null;

  const deliveryUrl = finalDeliveryUrl || project.final_delivery_url || '';
  if (!deliveryUrl) {
    const error = new Error('A valid final delivery URL is required.');
    error.statusCode = 400;
    throw error;
  }

  const balanceDue = Number(project.balance_due || 0);
  if (unlockDelivery && balanceDue > 0) {
    const error = new Error('Cannot unlock final delivery while balance remains.');
    error.statusCode = 409;
    throw error;
  }

  const shouldUnlock = unlockDelivery;
  const nextStatus = shouldUnlock ? 'delivered' : balanceDue > 0 ? 'balance_due' : 'finals_ready';
  const patch = {
    final_delivery_url: deliveryUrl,
    final_delivery_locked: shouldUnlock ? false : true,
    status: nextStatus,
  };
  await updateProject(id, patch, queryOptions);

  const eventType = shouldUnlock ? 'final_delivery_unlocked' : 'admin_delivery_updated';
  const message = shouldUnlock ? 'Final delivery unlocked for customer access.' : 'Final delivery updated.';
  await createProjectEvent({
    projectId: id,
    eventType,
    actorType: 'admin',
    message,
    metadata: {
      adminEmail: options.adminEmail || '',
      finalDeliveryUrl: deliveryUrl,
      unlocked: shouldUnlock,
    },
  }, queryOptions);

  if (shouldUnlock) {
    const sendEmail = options.sendEmailImpl || getSendStudioEmail();
    const customer = project.customers || {};
    if (customer.email) {
      try {
        const result = await sendEmail({
          to: customer.email,
          emailType: 'final_delivery_unlocked',
          data: {
            finalDeliveryUrl: deliveryUrl,
            portalUrl: buildPortalUrl(options.env),
          },
        }, { env: options.env, fetchImpl: options.fetchImpl });

        await createEmailEvent({
          projectId: id,
          customerId: customer.id || project.customer_id || null,
          emailType: 'final_delivery_unlocked',
          recipient: customer.email,
          status: 'sent',
          resendMessageId: result.id || null,
          metadata: { finalDeliveryUrl: deliveryUrl },
        }, queryOptions);
      } catch (error) {
        await createEmailEvent({
          projectId: id,
          customerId: customer.id || project.customer_id || null,
          emailType: 'final_delivery_unlocked',
          recipient: customer.email,
          status: 'failed',
          errorMessage: error.message,
          metadata: { finalDeliveryUrl: deliveryUrl },
        }, queryOptions);
      }
    }
  }

  return getAdminProjectDetail(id, queryOptions);
}

async function allowAdminExtraRevision(projectId, options = {}) {
  const id = requireValue(projectId, 'project id');
  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const project = await getProjectById(id, queryOptions);
  if (!project) return null;

  const nextExtraAllowed = Number(project.extra_revisions_allowed || 0) + 1;
  await updateProject(id, { extra_revisions_allowed: nextExtraAllowed }, queryOptions);
  await createProjectEvent({
    projectId: id,
    eventType: 'admin_extra_revision_allowed',
    actorType: 'admin',
    message: 'One extra revision was allowed.',
    metadata: {
      adminEmail: options.adminEmail || '',
      extraRevisionsAllowed: nextExtraAllowed,
    },
  }, queryOptions);

  return getAdminProjectDetail(id, queryOptions);
}

function buildAdminProjectDetail(input = {}) {
  const project = input.project || {};
  const customer = project.customers || project.customer || {};
  const normalizedProject = normalizeAdminProject(project);
  const includedRevisions = Number(project.included_revisions || 0);
  const usedRevisions = Number(project.used_revisions || 0);
  const extraRevisionsAllowed = Number(project.extra_revisions_allowed || 0);

  return {
    project: {
      ...normalizedProject,
      serviceId: project.service_id || '',
      songCount: Number(project.song_count || 1),
      includedRevisions,
      usedRevisions,
      extraRevisionsAllowed,
      finalDeliveryLocked: project.final_delivery_locked !== false,
    },
    customer: {
      id: String(customer.id || project.customer_id || ''),
      email: customer.email || '',
      name: customer.name || '',
    },
    financial: {
      totalAmount: Number(project.total_amount || 0),
      totalAmountLabel: formatDollars(project.total_amount || 0),
      amountPaid: Number(project.amount_paid || 0),
      amountPaidLabel: formatDollars(project.amount_paid || 0),
      balanceDue: Number(project.balance_due || 0),
      balanceDueLabel: formatDollars(project.balance_due || 0),
    },
    driveLinks: {
      project: project.drive_project_folder_url || '',
      upload: project.drive_upload_folder_url || '',
      finals: project.drive_finals_folder_url || '',
      finalDelivery: project.final_delivery_url || '',
    },
    files: (input.files || []).map(normalizeAdminFile),
    revisions: {
      included: includedRevisions,
      used: usedRevisions,
      extraAllowed: extraRevisionsAllowed,
      remaining: Math.max(0, includedRevisions + extraRevisionsAllowed - usedRevisions),
      items: (input.revisions || []).map(normalizeAdminRevision),
    },
    payments: (input.payments || []).map(normalizeAdminPayment),
    timeline: (input.events || []).map(normalizeAdminEvent),
    emailEvents: (input.emailEvents || []).map(normalizeAdminEmailEvent),
    adminNotes: (input.adminNotes || []).map(normalizeAdminNote),
  };
}

function buildAdminOverview(input = {}) {
  const leads = Array.isArray(input.leads) ? input.leads : [];
  const projects = Array.isArray(input.projects) ? input.projects : [];
  const revisions = Array.isArray(input.revisions) ? input.revisions : [];
  const events = Array.isArray(input.events) ? input.events : [];

  const newLeads = leads.filter((lead) => lead.status === 'new').map(normalizeAdminLead);
  const awaitingFiles = projects.filter((project) => project.status === 'awaiting_files').map(normalizeAdminProject);
  const filesSubmitted = projects.filter((project) => project.status === 'files_submitted').map(normalizeAdminProject);
  const activeProjects = projects.filter((project) => ACTIVE_PROJECT_STATUSES.has(project.status)).map(normalizeAdminProject);
  const revisionRequests = revisions.filter((revision) => OPEN_REVISION_STATUSES.has(revision.status)).map(normalizeAdminRevision);
  const finalsReady = projects.filter((project) => project.status === 'finals_ready').map(normalizeAdminProject);
  const balancesDue = projects
    .filter((project) => Number(project.balance_due || 0) > 0 && !CLOSED_PROJECT_STATUSES.has(project.status))
    .map(normalizeAdminProject);

  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      { key: 'newLeads', label: 'New Leads', count: newLeads.length },
      { key: 'awaitingFiles', label: 'Awaiting Files', count: awaitingFiles.length },
      { key: 'filesSubmitted', label: 'Files Submitted', count: filesSubmitted.length },
      { key: 'activeProjects', label: 'Active Projects', count: activeProjects.length },
      { key: 'revisionRequests', label: 'Revision Requests', count: revisionRequests.length },
      { key: 'finalsReady', label: 'Finals Ready', count: finalsReady.length },
      { key: 'balancesDue', label: 'Balances Due', count: balancesDue.length },
    ],
    queues: {
      newLeads,
      awaitingFiles,
      filesSubmitted,
      activeProjects,
      revisionRequests,
      finalsReady,
      balancesDue,
    },
    recentEvents: events.map(normalizeAdminEvent).slice(0, 12),
  };
}

const ACTIVE_PROJECT_STATUSES = new Set([
  'files_submitted',
  'reviewing',
  'quote_accepted',
  'paid',
  'mixing',
  'revision_requested',
  'revision_in_progress',
]);

const OPEN_REVISION_STATUSES = new Set(['requested', 'in_progress']);
const CLOSED_PROJECT_STATUSES = new Set(['approved', 'completed', 'closed']);
const ADMIN_PROJECT_STATUSES = new Set([
  'lead_new',
  'awaiting_files',
  'files_submitted',
  'reviewing',
  'quoted',
  'quote_sent',
  'quote_accepted',
  'paid',
  'mixing',
  'revision_requested',
  'revision_in_progress',
  'finals_ready',
  'balance_due',
  'delivered',
  'approved',
  'completed',
  'closed',
]);

function normalizeAdminLead(lead) {
  return {
    id: String(lead.id || ''),
    status: lead.status || '',
    email: lead.email || '',
    artistName: lead.artist_name || '',
    projectTitle: lead.project_title || '',
    source: lead.source || '',
    createdAt: lead.created_at || '',
    updatedAt: lead.updated_at || '',
  };
}

function normalizeAdminProject(project) {
  const balanceDue = Number(project.balance_due || 0);
  return {
    id: String(project.id || ''),
    projectCode: project.project_code || '',
    projectType: project.project_type || '',
    status: project.status || '',
    statusLabel: titleCase(project.status || 'active'),
    artistName: project.artist_name || '',
    projectTitle: project.project_title || '',
    title: project.project_title || project.artist_name || project.project_code || 'Untitled Project',
    balanceDue,
    balanceDueLabel: formatDollars(balanceDue),
    amountPaid: Number(project.amount_paid || 0),
    totalAmount: Number(project.total_amount || 0),
    driveProjectFolderUrl: project.drive_project_folder_url || '',
    driveUploadFolderUrl: project.drive_upload_folder_url || '',
    driveFinalsFolderUrl: project.drive_finals_folder_url || '',
    finalDeliveryUrl: project.final_delivery_url || '',
    createdAt: project.created_at || '',
    updatedAt: project.updated_at || '',
  };
}

function normalizeAdminRevision(revision) {
  const project = revision.projects || revision.project || {};
  return {
    id: String(revision.id || ''),
    projectId: revision.project_id || '',
    status: revision.status || '',
    notes: revision.notes || '',
    isExtraRevision: Boolean(revision.is_extra_revision),
    createdAt: revision.created_at || '',
    resolvedAt: revision.resolved_at || '',
    projectCode: project.project_code || '',
    projectTitle: project.project_title || '',
    artistName: project.artist_name || '',
    projectStatus: project.status || '',
  };
}

function normalizeAdminEvent(event) {
  return {
    id: String(event.id || ''),
    projectId: event.project_id || '',
    eventType: event.event_type || '',
    actorType: event.actor_type || '',
    message: event.message || '',
    metadata: event.metadata || {},
    createdAt: event.created_at || '',
  };
}

function normalizeAdminFile(file) {
  return {
    id: String(file.id || ''),
    projectId: file.project_id || '',
    orderId: file.order_id || '',
    uploadLink: file.upload_link || '',
    version: Number(file.version || 1),
    status: file.status || '',
    statusLabel: titleCase(file.status || 'submitted'),
    createdAt: file.created_at || '',
  };
}

function normalizeAdminPayment(payment) {
  return {
    id: String(payment.id || ''),
    projectId: payment.project_id || '',
    orderId: payment.order_id || '',
    quoteId: payment.quote_id || '',
    paypalOrderId: payment.paypal_order_id || '',
    paypalCaptureId: payment.paypal_capture_id || '',
    paymentPurpose: payment.payment_purpose || '',
    status: payment.status || '',
    amount: Number(payment.amount || 0),
    amountLabel: formatDollars(payment.amount || 0),
    currency: payment.currency || 'USD',
    createdAt: payment.created_at || '',
  };
}

function normalizeAdminEmailEvent(event) {
  return {
    id: String(event.id || ''),
    projectId: event.project_id || '',
    customerId: event.customer_id || '',
    emailType: event.email_type || '',
    recipient: event.recipient || '',
    status: event.status || '',
    resendMessageId: event.resend_message_id || '',
    errorMessage: event.error_message || '',
    metadata: event.metadata || {},
    createdAt: event.created_at || '',
  };
}

function normalizeAdminNote(note) {
  return {
    id: String(note.id || ''),
    projectId: note.project_id || '',
    note: note.note || '',
    createdAt: note.created_at || '',
  };
}

function titleCase(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDollars(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function normalizeOptionalHttpUrl(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') {
    const error = new Error('A valid final delivery URL is required.');
    error.statusCode = 400;
    throw error;
  }
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid');
    return url.toString();
  } catch (_error) {
    const error = new Error('A valid final delivery URL is required.');
    error.statusCode = 400;
    throw error;
  }
}

function buildPortalUrl(env = process.env) {
  const base = (env.SITE_URL || '').replace(/\/$/, '');
  return base ? `${base}/portal.html` : '/portal.html';
}

function getSendStudioEmail() {
  return require('../email/resend').sendStudioEmail;
}

async function deleteStudioRecord(table, id, options = {}) {
  const allowedTables = new Set(['leads', 'orders', 'payments', 'project_events', 'email_events']);
  if (!allowedTables.has(table)) throw new Error(`Cleanup cannot delete ${table} records.`);
  await supabaseRequest(`/${table}`, {
    method: 'DELETE',
    query: { id: `eq.${requireValue(id, `${table} id`)}` },
    prefer: 'return=minimal',
    ...options,
  });
}

function buildProjectCode(sequenceNumber) {
  const numeric = Number(sequenceNumber);
  if (!Number.isInteger(numeric) || numeric < 1) throw new Error('Project sequence must be a positive integer.');
  return `DCR-${String(numeric).padStart(6, '0')}`;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('A valid amount is required.');
  return amount.toFixed(2);
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function requireValue(value, label) {
  if (value === null || value === undefined || value === '') throw new Error(`${label} is required.`);
  return value;
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { message: text };
  }
}

module.exports = {
  addAdminProjectNote,
  allowAdminExtraRevision,
  buildAdminProjectDetail,
  buildAdminOverview,
  buildProjectCode,
  createAutomationTestRun,
  createEmailEvent,
  createLead,
  createProject,
  createProjectFile,
  createProjectEvent,
  createRevisionRequest,
  getCustomerByEmail,
  getAutomationTestRun,
  getAdminOverview,
  getAdminProjectDetail,
  getProjectById,
  getProjectByOrderId,
  getProjectForCustomer,
  getSupabaseConfig,
  linkOrderPaymentToProject,
  listAutomationTestRuns,
  normalizeEmail,
  requireValue,
  supabaseRequest,
  deleteStudioRecord,
  updateAdminProjectDelivery,
  updateAdminProjectStatus,
  updateAutomationTestRun,
  updateProject,
  upsertCustomer,
  upsertPaymentAndOrder,
};
