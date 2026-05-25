const { normalizeEmail } = require("./studio-records");
const projectEvents = require("../automation/project-event-schema");

function requireValue(value, name) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`Missing required field: ${name}`);
  }
  return value;
}

function createAuthorizedClient(jwtToken, dependencies = {}) {
  const env = dependencies.env || process.env;
  const fetchImpl = dependencies.fetchImpl || fetch;

  if (!jwtToken) {
    throw new Error("JWT token is required to create an authorized client.");
  }

  async function supabaseRequest(path, options = {}) {
    const supabaseUrl = env.SUPABASE_URL;
    const supabasePublicKey = env.SUPABASE_PUBLIC_KEY;

    if (!supabaseUrl || !supabasePublicKey) {
      throw new Error("SUPABASE_URL and SUPABASE_PUBLIC_KEY are required for authorized queries.");
    }

    const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1${path}`);
    Object.entries(options.query || {}).forEach(([key, value]) =>
      url.searchParams.set(key, value)
    );

    const headers = {
      apikey: supabasePublicKey,
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
    };

    const response = await fetchImpl(url, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch (_error) {
      body = { message: text };
    }

    if (!response.ok) {
      throw new Error(
        `Supabase request failed: ${response.status} ${body.message || JSON.stringify(body)}`
      );
    }

    return Array.isArray(body) ? body : [body];
  }

  async function getCustomerByEmail(email, options = {}) {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new Error("A valid customer email is required.");
    const rows = await supabaseRequest("/customers", {
      query: { email: `eq.${normalized}`, select: "id,email,name,auth_user_id" },
      ...options,
    });
    return rows[0] || null;
  }

  async function getProjectForCustomer(projectId, customerId, options = {}) {
    const rows = await supabaseRequest("/projects", {
      query: {
        id: `eq.${requireValue(projectId, "project id")}`,
        customer_id: `eq.${requireValue(customerId, "customer id")}`,
        select: "*",
      },
      ...options,
    });
    return rows[0] || null;
  }

  async function createProjectFile(input, options = {}) {
    const rows = await supabaseRequest("/project_files", {
      method: "POST",
      query: { select: "id,project_id,upload_link,status" },
      body: {
        project_id: requireValue(input.projectId, "project id"),
        order_id: input.orderId || null,
        upload_link: requireValue(input.uploadLink, "upload link"),
        status: input.status || "submitted",
      },
      ...options,
    });
    return rows[0];
  }

  async function updateProject(projectId, patch, options = {}) {
    const rows = await supabaseRequest("/projects", {
      method: "PATCH",
      query: {
        id: `eq.${requireValue(projectId, "project id")}`,
        customer_id: `eq.${requireValue(options.customerId, "customer id")}`,
        select: "*",
      },
      body: patch,
      ...options,
    });
    return rows[0];
  }

  async function createProjectEvent(event, options = {}) {
    const normalized = projectEvents.normalizeProjectEvent(event);
    const rows = await supabaseRequest("/project_events", {
      method: "POST",
      query: { select: "id,project_id,event_type" },
      body: {
        project_id: normalized.projectId,
        event_type: normalized.eventType,
        actor_type: normalized.actorType,
        message: normalized.message,
        metadata: normalized.metadata,
      },
      ...options,
    });
    return rows[0];
  }

  async function createRevisionRequest(input, options = {}) {
    const rows = await supabaseRequest("/revision_requests", {
      method: "POST",
      query: { select: "id,project_id,status" },
      body: {
        project_id: requireValue(input.projectId, "project id"),
        customer_id: requireValue(input.customerId, "customer id"),
        notes: requireValue(input.notes, "revision notes"),
        reference_links: input.referenceLinks || [],
        is_extra_revision: Boolean(input.isExtraRevision),
      },
      ...options,
    });
    return rows[0];
  }

  async function getQuoteForProjectCustomer(
    { quoteId, projectId, customerId },
    options = {}
  ) {
    const rows = await supabaseRequest("/quotes", {
      query: {
        id: `eq.${requireValue(quoteId, "quote id")}`,
        project_id: `eq.${requireValue(projectId, "project id")}`,
        customer_id: `eq.${requireValue(customerId, "customer id")}`,
        select: "*",
        limit: "1",
      },
      ...options,
    });
    return rows[0] || null;
  }

  async function updateQuote(quoteId, patch, options = {}) {
    const rows = await supabaseRequest("/quotes", {
      method: "PATCH",
      query: {
        id: `eq.${requireValue(quoteId, "quote id")}`,
        project_id: `eq.${requireValue(options.projectId, "project id")}`,
        customer_id: `eq.${requireValue(options.customerId, "customer id")}`,
        select: "*",
      },
      body: patch,
      ...options,
    });
    return rows[0] || null;
  }

  async function listQuotesForCustomer(customerId, options = {}) {
    return supabaseRequest("/quotes", {
      query: {
        customer_id: `eq.${requireValue(customerId, "customer id")}`,
        select: "*",
        order: "created_at.desc",
        limit: options.limit || "50",
      },
      ...options,
    });
  }

  async function listQuoteLineItemsForQuotes(quoteIds, options = {}) {
    if (!Array.isArray(quoteIds) || quoteIds.length === 0) return [];
    const normalized = quoteIds.filter(Boolean);
    if (normalized.length === 0) return [];
    return supabaseRequest("/quote_line_items", {
      query: {
        quote_id: `in.(${normalized.join(",")})`,
        select: "*",
        order: "created_at.asc",
      },
      ...options,
    });
  }

  return {
    supabaseRequest,
    normalizeEmail,
    getCustomerByEmail,
    getProjectForCustomer,
    createProjectFile,
    updateProject,
    createProjectEvent,
    createRevisionRequest,
    getQuoteForProjectCustomer,
    updateQuote,
    listQuotesForCustomer,
    listQuoteLineItemsForQuotes,
  };
}

module.exports = {
  createAuthorizedClient,
  createAuthorizedRecordsClient: createAuthorizedClient,
};
