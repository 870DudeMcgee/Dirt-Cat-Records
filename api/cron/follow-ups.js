const { ensureRuntimeEnv } = require("../../lib/env/runtime");
const { requireCronAuth } = require("../../lib/auth/cron-auth");
const { methodNotAllowed, sendJson } = require("../../lib/http/json");
const recordsDefault = require("../../lib/db/studio-records");
const {
  dispatchPendingFollowUps,
} = require("../../lib/automation/follow-up-dispatcher");

ensureRuntimeEnv();

function createFollowUpsCronHandler(dependencies = {}) {
  const env = dependencies.env || process.env;
  const requireCronAuthImpl =
    dependencies.requireCronAuthImpl || requireCronAuth;
  const records = dependencies.records || recordsDefault;
  const dispatchPendingFollowUpsImpl =
    dependencies.dispatchPendingFollowUpsImpl || dispatchPendingFollowUps;

  return async function followUpsCronHandler(req, res) {
    try {
      requireCronAuthImpl(req, env);
      if (req.method !== "GET") return methodNotAllowed(res);

      const candidates = await records.getFollowUpCandidates({
        env,
        now: getQueryValue(req, "now") || undefined,
        missingFilesDays: parseOptionalNumber(
          getQueryValue(req, "missingFilesDays")
        ),
        pendingQuoteDays: parseOptionalNumber(
          getQueryValue(req, "pendingQuoteDays")
        ),
        balanceDueDays: parseOptionalNumber(
          getQueryValue(req, "balanceDueDays")
        ),
        finalApprovalDays: parseOptionalNumber(
          getQueryValue(req, "finalApprovalDays")
        ),
      });

      const dryRun = parseBoolean(getQueryValue(req, "dryRun"), true);
      if (dryRun) {
        return sendJson(res, 200, {
          generatedAt: new Date().toISOString(),
          dryRun: true,
          count: candidates.length,
          candidates,
        });
      }

      const queueResults = await records.queueFollowUpJobs(candidates, { env });
      const shouldDispatch = parseBoolean(
        getQueryValue(req, "dispatch"),
        false
      );
      let dispatchResults = null;
      if (shouldDispatch) {
        dispatchResults = await dispatchPendingFollowUpsImpl({ records, env });
      }

      return sendJson(res, 200, {
        generatedAt: new Date().toISOString(),
        dryRun: false,
        count: candidates.length,
        candidates,
        queueResults,
        dispatchResults,
      });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode
          ? error.message
          : "Unable to collect follow-up candidates.",
      });
    }
  };
}

function getQueryValue(req, key) {
  if (req.query && req.query[key]) {
    return Array.isArray(req.query[key]) ? req.query[key][0] : req.query[key];
  }
  if (!req.url) return null;
  try {
    return new URL(req.url, "http://localhost").searchParams.get(key);
  } catch (_error) {
    return null;
  }
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (/^(1|true|yes)$/i.test(String(value))) return true;
  if (/^(0|false|no)$/i.test(String(value))) return false;
  return fallback;
}

const handler = createFollowUpsCronHandler();

module.exports = handler;
module.exports.createFollowUpsCronHandler = createFollowUpsCronHandler;
