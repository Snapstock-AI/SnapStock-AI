import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from "./modules/auth/auth.routes";

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);

app.get('', (req, res) => {
  res.send('express is working');
});



app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});