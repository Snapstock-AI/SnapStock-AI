import { Pool } from "pg";
import path from "path"
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

if (!process.env.JEST_WORKER_ID) {
  pool.connect()
    .then((client) => {
      console.log("PostgreSQL connected succesfully");
      client.release();
    })
    .catch((err) => {
      console.error("Failed to connect to database");
      //console.error(err);
    });
}

pool.on("error", (err) => {
  if (!process.env.JEST_WORKER_ID) {
    console.error("Database error:", err);
  }
});

export default {
  query: (text: string, params?: any[]) => pool.query(text, params)
};
