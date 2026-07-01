import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthRepository } from "./auth.repository";
import { RegisterDTO, LoginDTO } from "./auth.types";
import crypto from "crypto";
import { sendVerificationEmail } from "../../shared/utils/email";

export class AuthService {

  //REGISTER USER
  static async register(data: RegisterDTO) {

    const existingUser = await AuthRepository.findByEmail(data.email);

    if (existingUser) {
      throw new Error("User already exists");
    }

    const password_hash = await bcrypt.hash(data.password, 10);

    const user = await AuthRepository.createUser({
      ...data,
      password_hash
    });

    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await AuthRepository.saveEmailToken(user.id, token, expiresAt);

    await sendVerificationEmail(user.email, token);

    return {
      message: "User registered successfully-Please verify your mail",
      user
    };
  }


  //LOGIN USER
  static async login(data: LoginDTO) {

    const user = await AuthRepository.findByEmail(data.email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(
      data.password,
      user.password_hash
    );

    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    if (!user.email_verified) {
      throw new Error("Please verify your email first");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        system_role: user.system_role
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        system_role: user.system_role
      }
    };
  }

  static async verifyEmail(token: string) {
    const record = await AuthRepository.findToken(token);

    if (!record) {
      throw new Error("Invalid or expired token");
    }

    if (new Date() > record.expires_at) {
      throw new Error("Token expired");
    }
    
    const user = await AuthRepository.findById(record.user_id);

    if (user.email_verified) {
      return {
        message: "Email already verified"
      };
    }

    await AuthRepository.verifyUser(record.user_id);
    await AuthRepository.deleteEmailToken(token);

    return {
      message: "Email verified successfully"
    };
  }
}
