const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html, attachments) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // must be app password
      },
    });

    await transporter.sendMail({
      from: `"FixBuddy" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    });

    console.log("Email sent successfully");

  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
};

module.exports = sendEmail;