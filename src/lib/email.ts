interface PasswordResetEmailInput {
  to: string;
  firstName: string;
  locale: "fr" | "en";
  resetUrl: string;
  idempotencyKey: string;
}

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

export function isTransactionalEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export function renderPasswordResetEmail(input: Omit<PasswordResetEmailInput, "to" | "idempotencyKey">): RenderedEmail {
  const name = escapeHtml(input.firstName.trim() || (input.locale === "en" ? "there" : "vous"));
  const resetUrl = escapeHtml(input.resetUrl);
  const en = input.locale === "en";
  const subject = en ? "Reset your NEXORA password" : "Réinitialisez votre mot de passe NEXORA";
  const preheader = en
    ? "A secure link was requested for your NEXORA account."
    : "Un lien sécurisé a été demandé pour votre compte NEXORA.";
  const title = en ? "Choose a new password" : "Choisissez un nouveau mot de passe";
  const intro = en
    ? `Hello ${name}, use the secure button below to create a new password.`
    : `Bonjour ${name}, utilisez le bouton sécurisé ci-dessous pour créer un nouveau mot de passe.`;
  const action = en ? "Reset my password" : "Modifier mon mot de passe";
  const expiry = en ? "This single-use link expires in 30 minutes." : "Ce lien à usage unique expire dans 30 minutes.";
  const ignore = en
    ? "If you did not request this change, ignore this message. Your password will remain unchanged."
    : "Si vous n’êtes pas à l’origine de cette demande, ignorez ce message. Votre mot de passe restera inchangé.";
  const html = `<!doctype html><html lang="${input.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${subject}</title></head><body style="margin:0;background:#f6f1f5;color:#171217;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1f5"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;overflow:hidden;border:1px solid #eadfe7;border-radius:24px;background:#fff"><tr><td style="padding:28px 32px;background:#541249;color:#fff"><div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#e8bedf">NEXORA CAPITAL</div><h1 style="margin:14px 0 0;font-size:30px;line-height:1.08">${title}</h1></td></tr><tr><td style="padding:32px"><p style="margin:0;font-size:16px;line-height:1.7;color:#514951">${intro}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0"><tr><td style="border-radius:14px;background:#541249"><a href="${resetUrl}" style="display:inline-block;padding:15px 24px;color:#fff;text-decoration:none;font-size:15px;font-weight:700">${action}</a></td></tr></table><p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6e626b">${expiry}</p><p style="margin:0;font-size:13px;line-height:1.6;color:#6e626b">${ignore}</p><div style="margin-top:28px;padding-top:22px;border-top:1px solid #eee5eb"><p style="margin:0;font-size:11px;line-height:1.6;color:#8b7d87">${en ? "For your security, NEXORA will never ask for this link or your password." : "Pour votre sécurité, NEXORA ne vous demandera jamais ce lien ni votre mot de passe."}</p></div></td></tr></table></td></tr></table></body></html>`;
  const text = `${title}\n\n${intro}\n\n${action}: ${input.resetUrl}\n\n${expiry}\n${ignore}`;
  return { subject, html, text };
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("TRANSACTIONAL_EMAIL_NOT_CONFIGURED");
  const rendered = renderPasswordResetEmail(input);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `password-reset/${input.idempotencyKey}`,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: process.env.EMAIL_REPLY_TO?.trim() || undefined,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: "category", value: "password_reset" }],
    }),
  });
  if (!response.ok) throw new Error(`TRANSACTIONAL_EMAIL_FAILED_${response.status}`);
  const payload = (await response.json()) as { id?: string };
  if (!payload.id) throw new Error("TRANSACTIONAL_EMAIL_ID_MISSING");
  return payload.id;
}

