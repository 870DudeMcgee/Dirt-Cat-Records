const { createRouter } = require("../lib/http/router");
const createPaypalOrderHandler = require("../lib/api/create-paypal-order");
const capturePaypalOrderHandler = require("../lib/api/capture-paypal-order");
const checkoutConfigHandler = require("../lib/api/checkout-config");
const freeReviewHandler = require("../lib/api/public/free-review");
const projectSupportHandler = require("../lib/api/public/project-support");
const paypalWebhookHandler = require("../lib/api/webhooks/paypal");

const router = createRouter();

function routeNotFound(_req, res) {
  res.status(404).json({ error: "Public API route not found." });
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
    if (route === "create-paypal-order") {
      await createPaypalOrderHandler(req, res);
      return;
    }
    if (route === "capture-paypal-order") {
      await capturePaypalOrderHandler(req, res);
      return;
    }
    if (route === "checkout-config") {
      await checkoutConfigHandler(req, res);
      return;
    }
    if (route === "free-review") {
      await freeReviewHandler(req, res);
      return;
    }
    if (route === "project-support") {
      await projectSupportHandler(req, res);
      return;
    }
    if (route === "paypal-webhook") {
      await paypalWebhookHandler(req, res);
      return;
    }
    next();
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json({ error: error.message || "Internal server error" });
  }
});

registerGatewayRoutes("/api/public");
registerGatewayRoutes("/api/create-paypal-order");
registerGatewayRoutes("/api/capture-paypal-order");
registerGatewayRoutes("/api/checkout-config");
registerGatewayRoutes("/api/public/free-review");
registerGatewayRoutes("/api/public/project-support");
registerGatewayRoutes("/api/webhooks/paypal");

module.exports = router.handler();
