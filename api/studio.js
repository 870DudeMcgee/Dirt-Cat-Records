const { createRouter } = require("../lib/http/router");
const adminOverviewHandler = require("../lib/api/admin/overview");
const adminProjectsHandler = require("../lib/api/admin/projects");
const adminQuotesHandler = require("../lib/api/admin/quotes");
const setupWizardHandler = require("../lib/api/admin/setup-wizard");
const portalActionsHandler = require("../lib/api/portal/actions");

const router = createRouter();

function routeNotFound(_req, res) {
  res.status(404).json({ error: "Studio API route not found." });
}

function registerGatewayRoutes(path) {
  router.get(path, routeNotFound);
  router.post(path, routeNotFound);
  router.patch(path, routeNotFound);
  router.delete(path, routeNotFound);
}

router.use(async (req, res, next) => {
  const route = req.query.route;
  try {
    if (route === "admin-overview") {
      await adminOverviewHandler(req, res);
      return;
    }
    if (route === "admin-projects") {
      await adminProjectsHandler(req, res);
      return;
    }
    if (route === "admin-quotes") {
      await adminQuotesHandler(req, res);
      return;
    }
    if (route === "admin-setup-wizard") {
      await setupWizardHandler(req, res);
      return;
    }
    if (route === "portal-actions") {
      await portalActionsHandler(req, res);
      return;
    }
    next();
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || "Internal server error" });
  }
});

registerGatewayRoutes("/api/studio");

module.exports = router.handler();
