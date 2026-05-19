const { ensureRuntimeEnv } = require("../../lib/env/runtime");
const { requireAdmin } = require("../../lib/auth/supabase-auth");
const {
  methodNotAllowed,
  readJsonBody,
  sendJson,
} = require("../../lib/http/json");
const recordsDefault = require("../../lib/db/studio-records");

ensureRuntimeEnv();

function createAdminProjectsHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const records = dependencies.records || recordsDefault;
  const env = dependencies.env || process.env;

  return async function adminProjectsHandler(req, res) {
    try {
      const adminUser = await requireAdminImpl(req, { env });
      const action = getQueryValue(req, "action") || "detail";
      if (action === "detail") {
        if (req.method !== "GET") return methodNotAllowed(res);

        const projectId = getQueryValue(req, "projectId");
        if (!projectId)
          return sendJson(res, 400, { error: "projectId is required." });

        const project = await records.getAdminProjectDetail(projectId, { env });
        if (!project)
          return sendJson(res, 404, { error: "Project not found." });
        return sendJson(res, 200, { project });
      }

      if (action === "status") {
        if (req.method !== "POST") return methodNotAllowed(res);

        const body = await readJsonBody(req);
        if (!body.projectId)
          return sendJson(res, 400, { error: "projectId is required." });
        if (!body.status)
          return sendJson(res, 400, { error: "status is required." });

        const project = await records.updateAdminProjectStatus(
          body.projectId,
          body.status,
          {
            env,
            adminEmail: adminUser?.email || "",
          }
        );
        if (!project)
          return sendJson(res, 404, { error: "Project not found." });
        return sendJson(res, 200, { project });
      }

      if (action === "notes") {
        if (req.method !== "POST") return methodNotAllowed(res);

        const body = await readJsonBody(req);
        if (!body.projectId)
          return sendJson(res, 400, { error: "projectId is required." });
        if (!body.note)
          return sendJson(res, 400, { error: "note is required." });

        const project = await records.addAdminProjectNote(
          body.projectId,
          body.note,
          {
            env,
            adminEmail: adminUser?.email || "",
          }
        );
        if (!project)
          return sendJson(res, 404, { error: "Project not found." });
        return sendJson(res, 200, { project });
      }

      if (action === "delivery") {
        if (req.method !== "POST") return methodNotAllowed(res);

        const body = await readJsonBody(req);
        if (!body.projectId)
          return sendJson(res, 400, { error: "projectId is required." });

        const project = await records.updateAdminProjectDelivery(
          body.projectId,
          {
            finalDeliveryUrl: body.finalDeliveryUrl,
            unlockDelivery: body.unlockDelivery,
            notifyBalanceDue: body.notifyBalanceDue,
          },
          {
            env,
            adminEmail: adminUser?.email || "",
          }
        );
        if (!project)
          return sendJson(res, 404, { error: "Project not found." });
        return sendJson(res, 200, { project });
      }

      if (action === "extra-revision") {
        if (req.method !== "POST") return methodNotAllowed(res);

        const body = await readJsonBody(req);
        if (!body.projectId)
          return sendJson(res, 400, { error: "projectId is required." });

        const project = await records.allowAdminExtraRevision(body.projectId, {
          env,
          adminEmail: adminUser?.email || "",
        });
        if (!project)
          return sendJson(res, 404, { error: "Project not found." });
        return sendJson(res, 200, { project });
      }

      return sendJson(res, 404, { error: "Admin project action not found." });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode
          ? error.message
          : "Unable to load admin project.",
      });
    }
  };
}

function getQueryValue(req, key) {
  if (req.query && req.query[key])
    return Array.isArray(req.query[key]) ? req.query[key][0] : req.query[key];
  if (!req.url) return null;
  try {
    return new URL(req.url, "http://localhost").searchParams.get(key);
  } catch (_error) {
    return null;
  }
}

const handler = createAdminProjectsHandler();

module.exports = handler;
module.exports.createAdminProjectsHandler = createAdminProjectsHandler;
