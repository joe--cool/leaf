import nodemailer from 'nodemailer';
import { env } from './env.js';

function smtpTransport() {
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_APP_PASSWORD,
      },
    });
  }

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return null;
}

export async function sendEmail(options: {
  to: string[];
  subject: string;
  text: string;
}): Promise<void> {
  const transport = smtpTransport();
  if (!transport) {
    // Fallback for fully free local environments.
    console.log(`[email:dry-run] to=${options.to.join(',')} subject=${options.subject}`);
    console.log(options.text);
    return;
  }

  await transport.sendMail({
    from: env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
}
