import { SESv2Client, SendEmailCommand } from "npm:@aws-sdk/client-sesv2@3.691.0";

const LOGO_URL = "https://gearpro.app/icons/icon-512.png";
const ACCENT = "#7a8a5e";
const CREAM = "#f5ead8";

function getSes(): SESv2Client {
  return new SESv2Client({
    region: Deno.env.get("AWS_SES_REGION") || "us-east-1",
    credentials: {
      accessKeyId: Deno.env.get("AWS_SES_ACCESS_KEY_ID") ?? "",
      secretAccessKey: Deno.env.get("AWS_SES_SECRET_ACCESS_KEY") ?? "",
    },
  });
}

export function isEmailEnabled(): boolean {
  return Boolean(Deno.env.get("AWS_SES_ACCESS_KEY_ID") && Deno.env.get("AWS_SES_SECRET_ACCESS_KEY"));
}

function getFromAddress(): string {
  return Deno.env.get("EMAIL_FROM") ?? "Gear Pro <reports@hevelgroup.com>";
}

export async function sendEmail(opts: { to: string; subject: string; html: string; bcc?: string }): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isEmailEnabled()) {
    console.warn("[email] AWS_SES_ACCESS_KEY_ID not set — skipping email to", opts.to);
    return { ok: false, error: "email_disabled" };
  }
  try {
    const result = await getSes().send(new SendEmailCommand({
      FromEmailAddress: getFromAddress(),
      Destination: { ToAddresses: [opts.to], BccAddresses: opts.bcc ? [opts.bcc] : undefined },
      Content: { Simple: { Subject: { Data: opts.subject }, Body: { Html: { Data: opts.html } } } },
    }));
    return { ok: true, id: result.MessageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] send failed:", message);
    return { ok: false, error: message };
  }
}

/** Branded shell — olive green header w/ mountain-checkmark mark, cream background. */
function layout(bodyHtml: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06);">
        <tr><td style="background:${ACCENT};padding:22px 28px;text-align:center;">
          <img src="${LOGO_URL}" width="40" height="40" alt="Gear Pro" style="display:block;margin:0 auto 6px;border-radius:8px;">
          <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:.02em;">Gear Pro</span>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;font-size:15px;line-height:1.6;color:#2b2a24;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 28px 24px;font-size:12px;color:#9a9584;">
          Gear Pro &middot; Trip &amp; gear planning
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${ACCENT};color:#ffffff;font-weight:600;font-size:15px;padding:12px 26px;border-radius:8px;text-decoration:none;margin-top:20px;">${label}</a>`;

export function welcomeSubject(): string {
  return "Welcome to Gear Pro";
}

export function welcomeHtml(): string {
  return layout(`
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#1f1e19;">Welcome to Gear Pro</h1>
    <p style="margin:0 0 16px;">You're all set to plan trips, pack smarter, and keep your gear organized across every trip.</p>
    ${btn("https://gearpro.app", "Open Gear Pro")}
  `);
}
