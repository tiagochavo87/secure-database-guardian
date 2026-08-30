import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false") === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || "DBLAPOGE <no-reply@localhost>";

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

if (!transporter) {
  console.warn(
    "[AVISO] SMTP_HOST não configurado: emails (ex.: reset de senha) não serão enviados de verdade, " +
    "apenas registrados no log do servidor. Configure SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM " +
    "antes de liberar esta instalação para acesso remoto por usuários que não têm acesso ao log."
  );
}

export function isEmailConfigured() {
  return Boolean(transporter);
}

export async function sendPasswordResetEmail(to, link) {
  if (!transporter) {
    console.log(`[reset-password] SMTP não configurado. Link de recuperação para ${to}: ${link}`);
    return { delivered: false };
  }

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: "Recuperação de senha — DBLAPOGE",
    text: `Você solicitou a redefinição de senha da sua conta no DBLAPOGE.\n\n` +
      `Use o link abaixo para definir uma nova senha (válido por 1 hora):\n${link}\n\n` +
      `Se você não fez essa solicitação, ignore este email.`,
    html: `<p>Você solicitou a redefinição de senha da sua conta no <strong>DBLAPOGE</strong>.</p>` +
      `<p>Use o link abaixo para definir uma nova senha (válido por 1 hora):</p>` +
      `<p><a href="${link}">${link}</a></p>` +
      `<p>Se você não fez essa solicitação, ignore este email.</p>`,
  });
  return { delivered: true };
}
