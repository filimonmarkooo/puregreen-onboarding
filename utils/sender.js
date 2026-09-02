// Unified email sender.
// Prefers Resend (HTTPS, works everywhere including Railway).
// Falls back to SMTP/nodemailer if RESEND_API_KEY is not set.

const nodemailer = require('nodemailer');

const REPLY_TO = ['marko@puregreenfranchise.com', 'richard@puregreenfranchise.com'];

function usingResend() {
  return !!process.env.RESEND_API_KEY;
}

function fromAddress() {
  // Resend requires a verified domain. Until one is verified, their shared
  // onboarding sender works for testing.
  if (usingResend()) {
    return process.env.MAIL_FROM || 'Pure Green Franchise <onboarding@resend.dev>';
  }
  return `"Pure Green Franchise" <${process.env.SMTP_USER || 'noreply@puregreen.com'}>`;
}

function smtpTransport() {
  const port = parseInt(process.env.SMTP_PORT || '587');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: (process.env.SMTP_PASS || '').replace(/\s/g, '')
    },
    // Railway containers have no IPv6 egress route. Without this, Node resolves
    // smtp.gmail.com to an AAAA record and fails with ENETUNREACH.
    family: 4,
    dnsTimeout: 10000,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000
  });
}

/**
 * Send an email. Returns { ok, via, id?, error? } and never throws.
 */
async function sendMail({ to, subject, html, text, replyTo }) {
  const recipients = Array.isArray(to) ? to : [to];
  const reply = replyTo || REPLY_TO;

  if (usingResend()) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: fromAddress(),
        to: recipients,
        replyTo: reply,
        subject,
        html,
        ...(text ? { text } : {})
      });
      if (error) return { ok: false, via: 'resend', error: error.message || JSON.stringify(error) };
      return { ok: true, via: 'resend', id: data?.id };
    } catch (err) {
      return { ok: false, via: 'resend', error: err.message };
    }
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { ok: false, via: 'none', error: 'No email provider configured' };
  }

  try {
    await smtpTransport().sendMail({
      from: fromAddress(),
      to: recipients.join(', '),
      replyTo: Array.isArray(reply) ? reply.join(', ') : reply,
      subject,
      html,
      ...(text ? { text } : {})
    });
    return { ok: true, via: 'smtp' };
  } catch (err) {
    return { ok: false, via: 'smtp', error: err.message, code: err.code };
  }
}

function emailConfigured() {
  return usingResend() || (!!process.env.SMTP_USER && !!process.env.SMTP_PASS);
}

module.exports = { sendMail, emailConfigured, usingResend, fromAddress, REPLY_TO };
