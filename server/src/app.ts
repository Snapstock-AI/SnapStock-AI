import "reflect-metadata";
import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import detectionRoutes from "./modules/detection/detection.routes";

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

app.get("/", (_req, res) => {
  res.send("SnapStock backend is running");
});


export default app;