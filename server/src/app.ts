import "reflect-metadata";
import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import detectionRoutes from "./modules/detection/detection.routes";
import businessRoutes from "./modules/business/business.routes";
import shelfRoutes from "./modules/shelf/shelf.routes";

const app = express();

app.use(cors());
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
