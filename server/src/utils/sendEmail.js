const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html, text }) => {
  // If SMTP credentials exist, send via transport
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"SST Lost & Found" <no-reply@sst-lostfound.edu>',
        to,
        subject,
        text,
        html,
      });

      console.log(`[Email] Sent message: ${info.messageId}`);
      return true;
    } catch (err) {
      console.error('[Email] SMTP failed to send email:', err.message);
      return false;
    }
  }

  // Graceful development fallback: Print to console
  console.log(`
================== [EMAIL SIMULATION (DEV)] ==================
To: ${to}
Subject: ${subject}
Message:
${text || html}
==============================================================
  `);
  return true;
};

module.exports = sendEmail;
