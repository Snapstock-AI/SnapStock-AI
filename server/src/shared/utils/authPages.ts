// Self-contained HTML pages served directly by the backend for links that go
// out in emails (verify-email, reset-password). These exist so those flows
// work purely off the backend being reachable — no dependency on the
// separate web client dev server, which (unlike the backend) doesn't listen
// on the LAN by default and has its own env/IP config to keep in sync.

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pageShell(bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SnapStock AI</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#18352b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;min-height:100vh;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dce8e1;">
            <tr>
              <td style="background:#15803d;padding:28px 36px;color:#ffffff;">
                <div style="font-size:22px;font-weight:700;">SnapStock AI</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderStatusPage(opts: {
  success: boolean;
  heading: string;
  message: string;
}): string {
  const color = opts.success ? "#15803d" : "#b91c1c";
  return pageShell(`
    <div style="font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${color};">
      ${opts.success ? "Success" : "Error"}
    </div>
    <h1 style="margin:12px 0 16px;font-size:24px;line-height:1.3;color:#18352b;">${escapeHtml(opts.heading)}</h1>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#52645d;">${escapeHtml(opts.message)}</p>
  `);
}

export function renderResetPasswordForm(opts: { token: string; error?: string }): string {
  const safeToken = escapeHtml(opts.token);
  return pageShell(`
    <div style="font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#15803d;">Account recovery</div>
    <h1 style="margin:12px 0 16px;font-size:24px;line-height:1.3;color:#18352b;">Reset your password</h1>
    ${opts.error ? `<p style="margin:0 0 16px;font-size:14px;color:#b91c1c;">${escapeHtml(opts.error)}</p>` : ""}
    <form method="POST" action="/auth/reset-password/confirm">
      <input type="hidden" name="token" value="${safeToken}" />
      <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">New password</label>
      <input type="password" name="password" required minlength="8" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #d1d5db;border-radius:10px;font-size:15px;margin-bottom:16px;" />
      <button type="submit" style="width:100%;background:#15803d;color:#fff;border:none;border-radius:999px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;">Reset password</button>
    </form>
  `);
}
