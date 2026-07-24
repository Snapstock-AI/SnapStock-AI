import "reflect-metadata";
import path from "path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { AppDataSource } from "./config/data-source";
import authRoutes from "./modules/auth/auth.routes";
import detectionRoutes from "./modules/detection/detection.routes";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/detection", detectionRoutes);

app.get("", (_req, res) => {
  res.send("express is working");
});

AppDataSource.initialize()
  .then(() => {
    console.log("TypeORM connected successfully");
    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database via TypeORM");
    console.error(err);
    process.exit(1);
  });
