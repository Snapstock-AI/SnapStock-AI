import db from "../../config/db";
import { RegisterDTO } from "./auth.types";

export class AuthRepository {

  //CREATE USER-REGISTER
  static async createUser(data: RegisterDTO & { password_hash: string }) {
    const result = await db.query(
      `
      INSERT INTO users 
        (full_name, email, password_hash, nic, date_of_birth, system_role, email_verified)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        full_name,
        email,
        system_role,
        email_verified,
        created_at
      `,
      [
        data.full_name,
        data.email,
        data.password_hash,
        data.nic,
        data.date_of_birth,
        "BUSINESS_USER",
        false
      ]
    );

    return result.rows[0];
  }

  //FIND USER BY EMAIL-LOGIN
  static async findByEmail(email: string) {
    const result = await db.query(
      `
      SELECT 
        id,
        full_name,
        email,
        password_hash,
        system_role,
        email_verified
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
      `,
      [email]
    );

    return result.rows[0];
  }

  //FIND USER BY ID-middleware
  static async findById(id: string) {
    const result = await db.query(
      `
      SELECT 
        id,
        full_name,
        email,
        system_role,
        email_verified
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
      `,
      [id]
    );

    return result.rows[0];
  }

  static async saveEmailToken(userId: string, token: string, expiresAt: Date) {
    await db.query(
      `
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      `,
      [userId, token, expiresAt]
    );
  }

  static async findToken(token: string) {
    const result = await db.query(
      `
      SELECT * FROM email_verification_tokens
      WHERE token = $1
      `,
      [token]
    );

    return result.rows[0];
  }

  static async verifyUser(userId: string) {
    await db.query(
      `
      UPDATE users
      SET email_verified = true
      WHERE id = $1
      `,
      [userId]
    );
  }

  static async deleteEmailToken(token: string) {
    await db.query(
      `
      DELETE FROM email_verification_tokens
      WHERE token = $1
      `,
      [token]
    );
  }

}
