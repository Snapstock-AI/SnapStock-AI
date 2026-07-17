import path from "path";
import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { EmailVerificationToken } from "../entities/EmailVerificationToken";
import { PasswordResetToken } from "../entities/PasswordResetToken";

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [User, EmailVerificationToken, PasswordResetToken],
});
