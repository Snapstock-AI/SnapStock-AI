import "reflect-metadata";
import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import detectionRoutes from "./modules/detection/detection.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/detection", detectionRoutes);

app.get("", (_req, res) => {
  res.send("express is working");
});

export default app;