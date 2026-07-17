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

const emailTemplate = (
  eyebrow: string,
  heading: string,
  message: string,
  buttonText: string,
  link: string,
  footer: string
) => `
  <!doctype html>
  <html lang="en">
    <body style="margin:0;padding:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#18352b;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dce8e1;">
              <tr>
                <td style="background:#15803d;padding:28px 36px;color:#ffffff;">
                  <div style="font-size:22px;font-weight:700;">SnapStock AI</div>
                  <div style="margin-top:4px;font-size:13px;opacity:.85;">Smarter inventory. Fresher shelves.</div>
                </td>
              </tr>
              <tr>
                <td style="padding:36px;">
                  <div style="font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#15803d;">${eyebrow}</div>
                  <h1 style="margin:12px 0 16px;font-size:28px;line-height:1.25;color:#18352b;">${heading}</h1>
                  <p style="margin:0 0 26px;font-size:16px;line-height:1.65;color:#52645d;">${message}</p>
                  <a href="${link}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:999px;">${buttonText}</a>
                  <p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#718078;">${footer}</p>
                  <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#8b9892;word-break:break-all;">
                    Button not working? Copy this link into your browser:<br />
                    <a href="${link}" style="color:#15803d;">${link}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 36px;background:#f8faf9;border-top:1px solid #e6eee9;font-size:12px;color:#829089;text-align:center;">
                  This is an automated message from SnapStock AI.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

export const sendVerificationEmail = async (email: string, token: string) => {
  const link = `${clientUrl()}/verify-email?token=${token}`;

  await getTransporter().sendMail({
    from: `"SnapStock AI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Welcome to SnapStock AI — verify your email",
    text: `Welcome to SnapStock AI! Verify your email to activate your account: ${link}. This link expires in 1 hour.`,
    html: emailTemplate(
      "Welcome aboard",
      "One last step to get started",
      "Thanks for joining SnapStock AI! Please verify your email address to activate your account and start managing inventory with confidence.",
      "Verify my email",
      link,
      "For your security, this verification link expires in 1 hour. If you did not create this account, you can safely ignore this email."
    ),
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const link = `${clientUrl()}/reset-password?token=${token}`;

  await getTransporter().sendMail({
    from: `"SnapStock AI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Reset your SnapStock AI password",
    text: `We received a request to reset your SnapStock AI password. Set a new password here: ${link}. This link expires in 1 hour. If you did not request this, ignore this email.`,
    html: emailTemplate(
      "Password assistance",
      "Let’s get you back into your account",
      "We received a request to reset your SnapStock AI password. Use the secure button below to choose a new password.",
      "Reset my password",
      link,
      "This reset link expires in 1 hour and can only be used once. If you did not request a password reset, no action is needed and your account remains secure."
    ),
  });
};
