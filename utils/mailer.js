const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
}

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL_1 || 'admin@puregreen.com',
  process.env.ADMIN_EMAIL_2 || '',
  process.env.ADMIN_EMAIL_3 || ''
].filter(Boolean);

const FROM = `"Pure Green Franchise" <${process.env.SMTP_USER || 'noreply@puregreen.com'}>`;

async function sendNewFranchiseeAlert(user) {
  if (!process.env.SMTP_USER) return; // Skip if not configured
  const transporter = getTransporter();
  await transporter.sendMail({
    from: FROM,
    to: ADMIN_EMAILS.join(', '),
    subject: `🟢 New Franchisee Registered: ${user.storeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #046A38; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">pure<span style="color: #87CE21;">green</span></h1>
          <p style="color: #87CE21; margin: 8px 0 0; font-size: 13px; letter-spacing: 2px;">FRANCHISE ONBOARDING</p>
        </div>
        <div style="background: #f9f9f9; padding: 32px;">
          <h2 style="color: #046A38; margin-top: 0;">New Franchisee Registered</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666; width: 160px;"><strong>Store Name</strong></td><td style="padding: 8px 0; color: #333;">${user.storeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Owner</strong></td><td style="padding: 8px 0; color: #333;">${user.ownerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Address</strong></td><td style="padding: 8px 0; color: #333;">${user.storeAddress}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Email</strong></td><td style="padding: 8px 0; color: #333;">${user.email}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Planned Open Date</strong></td><td style="padding: 8px 0; color: #333;">${user.plannedOpenDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Registered</strong></td><td style="padding: 8px 0; color: #333;">${new Date(user.createdAt).toLocaleString()}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${process.env.BASE_URL || 'http://localhost:3000'}/admin.html" style="background: #046A38; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View in Admin Dashboard</a>
          </div>
        </div>
      </div>
    `
  });
}

async function sendTaskCompletionAlert(user, task) {
  if (!process.env.SMTP_USER) return;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: FROM,
    to: ADMIN_EMAILS.join(', '),
    subject: `✅ Task Completed: ${task.title} — ${user.storeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #046A38; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">pure<span style="color: #87CE21;">green</span></h1>
          <p style="color: #87CE21; margin: 8px 0 0; font-size: 13px; letter-spacing: 2px;">FRANCHISE ONBOARDING</p>
        </div>
        <div style="background: #f9f9f9; padding: 32px;">
          <div style="background: #87CE21; display: inline-block; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px;">
            <span style="color: #fff; font-weight: bold; font-size: 13px;">${task.platform}</span>
          </div>
          <h2 style="color: #046A38; margin-top: 0;">Task Completed</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666; width: 160px;"><strong>Store</strong></td><td style="padding: 8px 0; color: #333;">${user.storeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Owner</strong></td><td style="padding: 8px 0; color: #333;">${user.ownerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Task</strong></td><td style="padding: 8px 0; color: #333;">${task.title}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Platform</strong></td><td style="padding: 8px 0; color: #333;">${task.platform}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Completed</strong></td><td style="padding: 8px 0; color: #333;">${new Date().toLocaleString()}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${process.env.BASE_URL || 'http://localhost:3000'}/admin.html" style="background: #046A38; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View in Admin Dashboard</a>
          </div>
        </div>
      </div>
    `
  });
}

async function sendPasswordResetEmail(email, resetUrl) {
  if (!process.env.SMTP_USER) return;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset Your Pure Green Onboarding Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #046A38; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">pure<span style="color: #87CE21;">green</span></h1>
        </div>
        <div style="background: #f9f9f9; padding: 32px;">
          <h2 style="color: #046A38;">Reset Your Password</h2>
          <p style="color: #555;">Click the button below to reset your password. This link expires in 1 hour.</p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="background: #046A38; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #999; font-size: 12px;">If you did not request a password reset, please ignore this email.</p>
        </div>
      </div>
    `
  });
}

module.exports = { sendNewFranchiseeAlert, sendTaskCompletionAlert, sendPasswordResetEmail };
