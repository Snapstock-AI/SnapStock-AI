import path from "path";
import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { EmailVerificationToken } from "../entities/EmailVerificationToken";
import { PasswordResetToken } from "../entities/PasswordResetToken";
import { Session } from "../entities/Session";
import { Business } from "../entities/Business";
import { BusinessUser } from "../entities/BusinessUser";
import { Product } from "../entities/Product";
import { Shelf } from "../entities/Shelf";
import { Scan } from "../entities/Scan";
import { Detection } from "../entities/Detection";
import { EmployeeInvitation } from "../entities/EmployeeInvitation";
import { Alert } from "../entities/Alert";

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [
    User,
    EmailVerificationToken,
    PasswordResetToken,
    Session,
    Business,
    BusinessUser,
    Product,
    Shelf,
    Scan,
    Detection,
    EmployeeInvitation,
    Alert,
  ],
});
