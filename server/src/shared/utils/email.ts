import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(__dirname, "../../../../.env"),
});

const getTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const clientUrl = () =>
  process.env.CLIENT_URL || process.env.VITE_API_URL?.replace(":5000", ":5173") || "http://localhost:5173";

export const sendVerificationEmail = async (email: string, token: string) => {
  const link = `${clientUrl()}/verify-email?token=${token}`;

  await getTransporter().sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Verify your email",
    html: `
      <h2>Verify Your Email</h2>
      <p>Click below to verify your account:</p>
      <a href="${link}">Verify Email</a>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const link = `${clientUrl()}/reset-password?token=${token}`;

  await getTransporter().sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Reset your password",
    html: `
      <h2>Reset Your Password</h2>
      <p>Click below to reset your password:</p>
      <a href="${link}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `,
  });
};
