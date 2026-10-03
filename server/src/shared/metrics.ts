import type { Request, Response, NextFunction } from "express";
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: "snapstock_http_requests_total",
  help: "Total HTTP requests handled by the SnapStock API",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: "snapstock_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

function routeLabel(req: Request): string {
  // Prefer Express matched route to avoid high-cardinality path params.
  const route = req.route?.path;
  if (typeof route === "string") {
    return `${req.baseUrl || ""}${route}` || "unknown";
  }
  if (req.path === "/health" || req.path === "/metrics") return req.path;
  return "unmatched";
}

/** Records request counts and latency for Prometheus. */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/metrics") {
    next();
    return;
  }

  const end = httpRequestDurationSeconds.startTimer();
  res.on("finish", () => {
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status_code: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
}

/**
 * Prometheus scrape endpoint.
 * If METRICS_TOKEN is set, require `Authorization: Bearer <token>`.
 */
export async function metricsHandler(req: Request, res: Response) {
  const expected = process.env.METRICS_TOKEN?.trim();
  if (expected) {
    const header = req.get("authorization") || "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match || match[1] !== expected) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
  }

  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
}

export { register };
