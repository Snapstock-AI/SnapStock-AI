import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./modules/auth/auth.routes";
import detectionRoutes from "./modules/detection/detection.routes";
import businessRoutes from "./modules/business/business.routes";
import shelfRoutes from "./modules/shelf/shelf.routes";

// NFR-SEC-001.3: outside production any origin is accepted for local development; in
// production only CLIENT_URL / CORS_ORIGINS are, and with neither set cross-origin
// access is denied rather than falling back to a wildcard.
function corsOptions(): cors.CorsOptions {
  const allowed = [process.env.CLIENT_URL, ...(process.env.CORS_ORIGINS?.split(",") ?? [])]
    .map((origin) => origin?.trim().replace(/\/$/, ""))
    .filter((origin): origin is string => Boolean(origin));

  if (allowed.length === 0 && process.env.NODE_ENV !== "production") {
    return {};
  }

  return { origin: allowed };
}

const app = express();

app.use(helmet());
app.use(cors(corsOptions()));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "snapstock-backend",
  });
});

app.use("/auth", authRoutes);
app.use("/detection", detectionRoutes);
app.use("/businesses", businessRoutes);
app.use("/shelves", shelfRoutes);

app.get("/", (_req, res) => {
  res.send("SnapStock backend is running");
});

export default app;
