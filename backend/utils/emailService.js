// backend/utils/emailService.js

"use strict";

require("dotenv").config();
const nodemailer = require("nodemailer");

/* Create transporter */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* Verify SMTP connection */
async function verifySMTP() {
  try {
    await transporter.verify();
    console.log("✅ SMTP Server connected successfully");
  } catch (error) {
    console.error("❌ SMTP connection failed:", error.message);
  }
}

verifySMTP();

/* Send email */
const sendEmail = async ({ to, subject, html }) => {
  if (!to || !subject || !html) {
    throw new Error("Missing required email fields");
  }

  const info = await transporter.sendMail({
    from: `"LocalServe" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`📧 Email sent to ${to} | ID: ${info.messageId}`);

  return info;
};

module.exports = { sendEmail };