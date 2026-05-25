class HttpRouter {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  get(path, ...handlers) {
    return this.addRoute("GET", path, handlers);
  }

  post(path, ...handlers) {
    return this.addRoute("POST", path, handlers);
  }

  patch(path, ...handlers) {
    return this.addRoute("PATCH", path, handlers);
  }

  delete(path, ...handlers) {
    return this.addRoute("DELETE", path, handlers);
  }

  addRoute(method, path, handlers) {
    const paramNames = [];
    const regexSource = path.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    const regex = new RegExp(`^${regexSource}$`);

    this.routes.push({
      method,
      path,
      regex,
      paramNames,
      handlers,
    });
    return this;
  }

  handler() {
    return async (req, res) => {
      if (typeof res.status !== "function") {
        res.status = function (code) {
          res.statusCode = code;
          return res;
        };
      }
      if (typeof res.json !== "function") {
        res.json = function (body) {
          if (!res.writableEnded) {
            if (typeof res.setHeader === "function") {
              res.setHeader("Content-Type", "application/json");
            }
            res.end(JSON.stringify(body));
          }
          return res;
        };
      }

      const parsedUrl = new URL(req.url, "http://localhost");
      const pathname = parsedUrl.pathname;
      const method = req.method;

      let matchedRoute = null;
      let params = {};

      for (const route of this.routes) {
        if (route.method !== method) continue;
        const match = route.regex.exec(pathname);
        if (match) {
          matchedRoute = route;
          route.paramNames.forEach((name, index) => {
            params[name] = decodeURIComponent(match[index + 1]);
          });
          break;
        }
      }

      if (!matchedRoute) {
        res.status(404).json({ error: `Route ${method} ${pathname} not found.` });
        return;
      }

      req.params = params;
      req.query = Object.fromEntries(parsedUrl.searchParams.entries());

      const allHandlers = [...this.middlewares, ...matchedRoute.handlers];
      let index = 0;

      const next = async (err) => {
        if (err) {
          const statusCode = err.statusCode || 500;
          res.status(statusCode).json({ error: err.message || "Internal server error" });
          return;
        }

        if (index < allHandlers.length) {
          const currentHandler = allHandlers[index++];
          try {
            await currentHandler(req, res, next);
          } catch (catchErr) {
            await next(catchErr);
          }
        }
      };

      await next();
    };
  }
}

function createRouter() {
  return new HttpRouter();
}

module.exports = {
  HttpRouter,
  createRouter,
};
