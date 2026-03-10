"use strict";
const path = require("path");

// ─── Brand Config ─────────────────────────────────────────────────────────────
const BRAND = {
  name: "FixBuddy",
 logo: path.join(__dirname, "../assets/logo.png"),
  tagline: "Your Local Service Partner",
  supportEmail: "support@smartlocalservices.in",
  website: "https://zqhq3ppc-3000.inc1.devtunnels.ms/",
  phone: "+91 99999 99999",

  // Palette — ColorHunt #FFD400 #FFC300 #FF8C00 #FF5F00
  primary: "#FF8C00", // orange
  primaryDark: "#FF5F00", // deep orange
  accent: "#FFF8E7", // warm light tint
  accentMid: "#FFC300", // golden yellow
  accentBright: "#FFD400", // bright yellow

  success: "#22C55E",
  successDark: "#16A34A",
  warning: "#D97706",
  danger: "#EF4444",
  dangerDark: "#DC2626",

  dark: "#1A1209", // warm near-black
  muted: "#A89070", // warm grey
  border: "#F0E4C8", // warm light border
  white: "#FFFFFF",
  bg: "#FFFCF5", // warm page background
};

// ─── Base Shell ───────────────────────────────────────────────────────────────
const baseTemplate = (content, previewText = "") =>
  `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>${BRAND.name}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FFF8E7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;color:#FFF8E7;font-size:1px;">
    ${previewText}&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF8E7;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Wrapper -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.primaryDark} 100%);border-radius:12px 12px 0 0;padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!-- Logo badge -->
                    <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;">
                      <tr>
                        <td style="background:${BRAND.white};border-radius:10px;padding:8px 14px;display:inline-block;">
                          <span style="color:${BRAND.primary};font-size:20px;font-weight:900;letter-spacing:-0.5px;"><img
  src="${BRAND.logo}"
  alt="${BRAND.name} Logo"
  style="height:34px;width:auto;display:block;"
/></span>
                        </td>
                        <td style="padding-left:14px;vertical-align:middle;">
                          <div style="color:${BRAND.dark};font-size:17px;font-weight:700;line-height:1.2;">${BRAND.name}</div>
                          <div style="color:rgba(26,18,9,0.55);font-size:11px;margin-top:2px;">${BRAND.tagline}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background:${BRAND.white};padding:0 40px 32px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
              ${content}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#FF5F00;border-radius:0 0 12px 12px;padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="color:rgba(26,18,9,0.9);font-size:13px;font-weight:600;margin:0 0 4px;">Need help?</p>
                    <p style="color:rgba(26,18,9,0.65);font-size:12px;margin:0;">
                      📧 <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.accentBright};text-decoration:none;">${BRAND.supportEmail}</a>
                      &nbsp;&nbsp;|&nbsp;&nbsp;
                      📞 ${BRAND.phone}
                    </p>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <a href="${BRAND.website}" style="color:rgba(26,18,9,0.45);font-size:11px;text-decoration:none;">${BRAND.website.replace("https://", "")}</a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top:1px solid rgba(255,212,0,0.3);padding-top:16px;margin-top:16px;">
                    <p style="color:rgba(26,18,9,0.38);font-size:11px;margin:0;text-align:center;">
                      © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.<br/>
                      You're receiving this email because of your activity on our platform.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

// ─── Shared Components ────────────────────────────────────────────────────────

const statusBadge = (text, color) => `
  <span style="display:inline-block;background:${color}1A;color:${color};font-size:11px;font-weight:700;
    padding:4px 12px;border-radius:20px;border:1px solid ${color}40;letter-spacing:0.5px;text-transform:uppercase;">
    ${text}
  </span>`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};width:40%;">
      <span style="color:${BRAND.muted};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;">${label}</span>
    </td>
    <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${BRAND.border};">
      <span style="color:${BRAND.dark};font-size:14px;font-weight:500;">${value}</span>
    </td>
  </tr>`;

const ctaButton = (text, url, color = BRAND.primary) => `
  <table cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background:${color};border-radius:8px;padding:14px 28px;">
        <a href="${url}" style="color:${BRAND.dark};font-size:14px;font-weight:700;text-decoration:none;display:block;">${text}</a>
      </td>
    </tr>
  </table>`;

const alertBox = (text, color, icon = "ℹ️") => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="background:${color}12;border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:14px 18px;">
        <p style="margin:0;color:${color};font-size:13px;font-weight:500;">${icon} ${text}</p>
      </td>
    </tr>
  </table>`;

const heroIcon = (emoji) => `
  <div style="width:64px;height:64px;background:${BRAND.accent};border-radius:50%;display:flex;
    align-items:center;justify-content:center;margin:32px auto 20px;font-size:28px;text-align:center;line-height:64px;">
    ${emoji}
  </div>`;

const sectionTitle = (title, subtitle = "") => `
  <div style="text-align:center;padding-top:32px;padding-bottom:${subtitle ? "8" : "24"}px;">
    <h1 style="margin:0;color:${BRAND.dark};font-size:22px;font-weight:800;">${title}</h1>
    ${subtitle ? `<p style="margin:8px 0 0;color:${BRAND.muted};font-size:14px;">${subtitle}</p>` : ""}
  </div>`;

const detailCard = (rows) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${BRAND.accent};border-radius:10px;padding:4px 20px;margin:20px 0;border:1px solid ${BRAND.border};">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows.join("")}
      </table>
    </td></tr>
  </table>`;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. BOOKING SUBMITTED — to Customer
// ═══════════════════════════════════════════════════════════════════════════════
exports.bookingSubmittedCustomer = ({
  customerName,
  serviceName,
  providerName,
  scheduledDate,
  scheduledTime,
  bookingId,
}) =>
  baseTemplate(
    `
    ${heroIcon("🎉")}
    ${sectionTitle("Booking Request Sent!", "Your request has been submitted and is awaiting provider confirmation.")}

    ${alertBox("You will receive another email once the provider accepts your booking.", BRAND.warning, "⏳")}

    ${detailCard([
      infoRow("Booking ID", `#${String(bookingId).slice(-8).toUpperCase()}`),
      infoRow("Service", serviceName),
      infoRow("Provider", providerName),
      infoRow("Date", scheduledDate),
      infoRow("Time", scheduledTime),
    ])}

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:20px 0 0;">
      Hi <strong style="color:${BRAND.dark};">${customerName}</strong>, we've received your booking request.
      The provider typically responds within 30 minutes. We'll notify you right away!
    </p>
  `,
    `Your booking for ${serviceName} is pending confirmation.`,
  );

// ═══════════════════════════════════════════════════════════════════════════════
// 2. NEW BOOKING ALERT — to Provider
// ═══════════════════════════════════════════════════════════════════════════════
exports.newBookingProvider = ({
  providerName,
  customerName,
  customerPhone,
  serviceName,
  scheduledDate,
  scheduledTime,
  address,
  bookingId,
}) =>
  baseTemplate(
    `
    ${heroIcon("📋")}
    ${sectionTitle("New Booking Request", "A customer wants to book your service.")}

    ${alertBox("Please accept or reject this request as soon as possible.", BRAND.primary, "🔔")}

    ${detailCard([
      infoRow("Booking ID", `#${String(bookingId).slice(-8).toUpperCase()}`),
      infoRow("Customer", customerName),
      infoRow("Phone", customerPhone || "Not provided"),
      infoRow("Service", serviceName),
      infoRow("Scheduled", `${scheduledDate} at ${scheduledTime}`),
      infoRow("Address", address || "See app for details"),
    ])}

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:20px 0 28px;">
      Hi <strong style="color:${BRAND.dark};">${providerName}</strong>, you have a new service request waiting for your action.
      Log in to your dashboard to accept or decline.
    </p>

    <div style="text-align:center;">
      ${ctaButton("View in Dashboard →", `${BRAND.website}/provider/bookings`)}
    </div>
  `,
    `New booking request from ${customerName} for ${serviceName}.`,
  );

// ═══════════════════════════════════════════════════════════════════════════════
// 3. BOOKING ACCEPTED — to Customer
// ═══════════════════════════════════════════════════════════════════════════════
exports.bookingAcceptedCustomer = ({
  customerName,
  serviceName,
  providerName,
  providerPhone,
  scheduledDate,
  scheduledTime,
  bookingId,
}) =>
  baseTemplate(
    `
    ${heroIcon("✅")}
    ${sectionTitle("Booking Confirmed!", "Great news — your provider has accepted your request.")}

    ${alertBox("Your service is now confirmed. Please be available at the scheduled time.", BRAND.success, "✅")}

    ${detailCard([
      infoRow("Booking ID", `#${String(bookingId).slice(-8).toUpperCase()}`),
      infoRow("Service", serviceName),
      infoRow("Provider", providerName),
      infoRow("Provider Phone", providerPhone || "Available in app"),
      infoRow("Date", scheduledDate),
      infoRow("Time", scheduledTime),
    ])}

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:20px 0 0;">
      Hi <strong style="color:${BRAND.dark};">${customerName}</strong>, everything is set!
      If you need to make any changes, please contact us at least 2 hours before the scheduled time.
    </p>
  `,
    `${providerName} has confirmed your ${serviceName} booking.`,
  );

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BOOKING REJECTED — to Customer
// ═══════════════════════════════════════════════════════════════════════════════
exports.bookingRejectedCustomer = ({ customerName, serviceName, bookingId }) =>
  baseTemplate(
    `
    ${heroIcon("❌")}
    ${sectionTitle("Booking Not Accepted", "Unfortunately, the provider could not take this booking.")}

    ${alertBox("No charges have been applied. You can search for another available provider.", BRAND.danger, "💡")}

    ${detailCard([
      infoRow("Booking ID", `#${String(bookingId).slice(-8).toUpperCase()}`),
      infoRow("Service", serviceName),
      infoRow("Status", statusBadge("Rejected", BRAND.danger)),
    ])}

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:20px 0 28px;">
      Hi <strong style="color:${BRAND.dark};">${customerName}</strong>, we apologise for the inconvenience.
      There are many verified providers available on our platform — let's find you another one!
    </p>

    <div style="text-align:center;">
      ${ctaButton("Find Another Provider →", `${BRAND.website}/services`)}
    </div>
  `,
    `Your booking for ${serviceName} was not accepted.`,
  );

// ═══════════════════════════════════════════════════════════════════════════════
// 5. BOOKING COMPLETED + INVOICE — to Customer
// ═══════════════════════════════════════════════════════════════════════════════
exports.bookingCompletedCustomer = ({
  customerName,
  serviceName,
  providerName,
  billAmount,
  bookingId,
}) =>
  baseTemplate(
    `
    ${heroIcon("🏆")}
    ${sectionTitle("Service Completed!", "We hope you had a great experience.")}

    ${alertBox("Your invoice is attached to this email as a PDF. Please find it below.", BRAND.primary, "📎")}

    ${detailCard([
      infoRow("Booking ID", `#${String(bookingId).slice(-8).toUpperCase()}`),
      infoRow("Service", serviceName),
      infoRow("Provider", providerName),
      infoRow(
        "Amount Paid",
        `<strong style="color:${BRAND.success};font-size:16px;">Rs. ${Number(billAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>`,
      ),
      infoRow("Status", statusBadge("Completed", BRAND.success)),
    ])}

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:24px 0;background:#FFFBEB;border-radius:10px;padding:16px 20px;border:1px solid #F0E4C8;">
      <tr>
        <td>
          <p style="margin:0 0 6px;color:${BRAND.primary};font-weight:700;font-size:13px;">⭐ Rate Your Experience</p>
          <p style="margin:0;color:${BRAND.muted};font-size:13px;">Your feedback helps other customers choose the best providers.</p>
        </td>
        <td align="right" style="white-space:nowrap;padding-left:12px;">
          ${ctaButton("Leave a Review", `${BRAND.website}/reviews/new`, BRAND.accentMid)}
        </td>
      </tr>
    </table>

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:4px 0 0;">
      Hi <strong style="color:${BRAND.dark};">${customerName}</strong>, thank you for choosing ${BRAND.name}.
      We look forward to serving you again!
    </p>
  `,
    `Your ${serviceName} service is complete. Invoice attached.`,
  );

// ═══════════════════════════════════════════════════════════════════════════════
// 6. BOOKING CANCELLED — to Provider
// ═══════════════════════════════════════════════════════════════════════════════
exports.bookingCancelledProvider = ({
  providerName,
  customerName,
  serviceName,
  scheduledDate,
  bookingId,
}) =>
  baseTemplate(
    `
    ${heroIcon("🚫")}
    ${sectionTitle("Booking Cancelled", "A customer has cancelled their booking.")}

    ${alertBox("This slot is now free. No action is required from your side.", BRAND.warning, "📅")}

    ${detailCard([
      infoRow("Booking ID", `#${String(bookingId).slice(-8).toUpperCase()}`),
      infoRow("Customer", customerName),
      infoRow("Service", serviceName),
      infoRow("Was Scheduled For", scheduledDate),
      infoRow("Status", statusBadge("Cancelled", BRAND.danger)),
    ])}

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:20px 0 0;">
      Hi <strong style="color:${BRAND.dark};">${providerName}</strong>, the customer has cancelled this booking.
      Your schedule has been updated automatically. Keep up the great work!
    </p>
  `,
    `${customerName} has cancelled the ${serviceName} booking.`,
  );

// ═══════════════════════════════════════════════════════════════════════════════
// 7. BOOKING CANCELLED — to Customer (confirmation)
// ═══════════════════════════════════════════════════════════════════════════════
exports.bookingCancelledCustomer = ({ customerName, serviceName, bookingId }) =>
  baseTemplate(
    `
    ${heroIcon("🚫")}
    ${sectionTitle("Cancellation Confirmed", "Your booking has been successfully cancelled.")}

    ${detailCard([
      infoRow("Booking ID", `#${String(bookingId).slice(-8).toUpperCase()}`),
      infoRow("Service", serviceName),
      infoRow("Status", statusBadge("Cancelled", BRAND.danger)),
    ])}

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:20px 0 28px;">
      Hi <strong style="color:${BRAND.dark};">${customerName}</strong>, your booking has been cancelled.
      If a payment was made, any applicable refund will be processed within 5–7 business days.
    </p>

    <div style="text-align:center;">
      ${ctaButton("Book Again →", `${BRAND.website}/services`)}
    </div>
  `,
    `Your ${serviceName} booking has been cancelled.`,
  );

// ═══════════════════════════════════════════════════════════════════════════════
// 8. PROVIDER ACCEPTED RECEIPT — confirmation to provider they accepted
// ═══════════════════════════════════════════════════════════════════════════════
exports.providerAcceptedReceipt = ({
  providerName,
  customerName,
  customerPhone,
  serviceName,
  scheduledDate,
  scheduledTime,
  bookingId,
}) =>
  baseTemplate(
    `
    ${heroIcon("✅")}
    ${sectionTitle("Booking Accepted!", "You have confirmed this service request.")}

    ${alertBox("Please be ready at the scheduled time. The customer has been notified.", BRAND.success, "📅")}

    ${detailCard([
      infoRow("Booking ID", `#${String(bookingId).slice(-8).toUpperCase()}`),
      infoRow("Customer", customerName),
      infoRow("Customer Phone", customerPhone),
      infoRow("Service", serviceName),
      infoRow("Date", scheduledDate),
      infoRow("Time", scheduledTime),
    ])}

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:20px 0 0;">
      Hi <strong style="color:${BRAND.dark};">${providerName}</strong>, this booking is now confirmed on your schedule.
      If anything changes, please update the booking status via your dashboard promptly.
    </p>
  `,
    `You confirmed the ${serviceName} booking from ${customerName}.`,
  );

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PROVIDER REJECTED RECEIPT — confirmation to provider they rejected
// ═══════════════════════════════════════════════════════════════════════════════
exports.providerRejectedReceipt = ({
  providerName,
  customerName,
  serviceName,
  bookingId,
}) =>
  baseTemplate(
    `
    ${heroIcon("❌")}
    ${sectionTitle("Booking Rejected", "You have declined this service request.")}

    ${detailCard([
      infoRow("Booking ID", `#${String(bookingId).slice(-8).toUpperCase()}`),
      infoRow("Customer", customerName),
      infoRow("Service", serviceName),
      infoRow("Status", statusBadge("Rejected", BRAND.danger)),
    ])}

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:20px 0 0;">
      Hi <strong style="color:${BRAND.dark};">${providerName}</strong>, you have declined this booking.
      The customer has been notified and directed to find another provider.
      Your availability is still marked as active for new requests.
    </p>
  `,
    `You declined the ${serviceName} booking from ${customerName}.`,
  );

// ═══════════════════════════════════════════════════════════════════════════════
// 10. PROVIDER JOB COMPLETED — earnings summary to provider
// ═══════════════════════════════════════════════════════════════════════════════
exports.bookingCompletedProvider = ({
  providerName,
  customerName,
  serviceName,
  billAmount,
  scheduledDate,
  bookingId,
}) =>
  baseTemplate(
    `
    ${heroIcon("💰")}
    ${sectionTitle("Job Completed!", "Great work — your service has been marked complete.")}

    ${alertBox("Payment will be processed as per your subscription terms.", BRAND.primary, "💳")}

    ${detailCard([
      infoRow("Booking ID", `#${String(bookingId).slice(-8).toUpperCase()}`),
      infoRow("Customer", customerName),
      infoRow("Service", serviceName),
      infoRow("Date", scheduledDate),
      infoRow(
        "Earned",
        `<strong style="color:${BRAND.success};font-size:16px;">Rs. ${Number(billAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>`,
      ),
      infoRow("Status", statusBadge("Completed", BRAND.success)),
    ])}

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:20px 0 0;">
      Hi <strong style="color:${BRAND.dark};">${providerName}</strong>, thank you for delivering a great service!
      Keep up the quality work — happy customers lead to better ratings and more bookings.
    </p>
  `,
    `Job completed for ${customerName}. Rs. ${billAmount} earned.`,
  );

// ADD TO: backend/utils/emailTemplates.js

exports.userBanned = ({ userName, reason, supportEmail, bannedDate }) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
<div style="background:#DC2626;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
<h2 style="color:#fff;margin:0;">⚠️ Account Suspended</h2>
</div>
<div style="background:#fff;padding:28px;border:1px solid #e5e7eb;">
<p>Dear <strong>${userName}</strong>,</p>
<p>Your SmartLocalServices account has been suspended as of <strong>${bannedDate}</strong>.</p>
<div style="background:#FEE2E2;border-left:4px solid #DC2626;padding:16px;margin:20px 0;
                border-radius:0 8px 8px 0;">
<strong>Reason for suspension:</strong><br/>
<span style="color:#991B1B;">${reason}</span>
</div>
<p>If you believe this action was taken in error, please contact our support team:</p>
<a href="mailto:${supportEmail}" style="background:#1A1A2E;color:#fff;padding:12px 24px;
       border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">
       Contact Support
</a>
<p style="color:#6B7280;font-size:12px;margin-top:24px;">
      This is an automated notification from SmartLocalServices.
</p>
</div>
</div>`;

exports.providerBanned = ({ providerName, reason, supportEmail, bannedDate }) =>
  exports.userBanned({
    userName: providerName,
    reason,
    supportEmail,
    bannedDate,
  });

exports.userReactivated = ({ userName, supportEmail }) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
<div style="background:#06864B;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
<h2 style="color:#fff;margin:0;">✅ Account Reactivated</h2>
</div>
<div style="background:#fff;padding:28px;border:1px solid #e5e7eb;">
<p>Dear <strong>${userName}</strong>,</p>
<p>Great news! Your SmartLocalServices account has been <strong>reactivated</strong>.</p>
<p>You can now log in and resume using all platform features.</p>
<a href="${process.env.FRONTEND_URL}/login"
       style="background:#06864B;color:#fff;padding:12px 24px;
              border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">
       Log In Now
</a>
</div>
</div>`;

// ADD TO: backend/utils/emailTemplates.js

exports.forgotPasswordOTP = ({ userName, otp, expiryMinutes }) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
<div style="background:linear-gradient(135deg,#FF8C00,#FF5F00);
              padding:20px;border-radius:8px 8px 0 0;text-align:center;">
<h2 style="color:#fff;margin:0;">🔐 Password Reset OTP</h2>
</div>
<div style="background:#fff;padding:28px;border:1px solid #e5e7eb;
              border-radius:0 0 8px 8px;">
<p>Hi <strong>${userName}</strong>,</p>
<p>Use the OTP below to reset your password. It expires in
<strong>${expiryMinutes} minutes</strong>.</p>
<div style="text-align:center;margin:32px 0;">
<div style="background:#F3F4F6;border-radius:12px;padding:24px;
                  display:inline-block;min-width:200px;">
<div style="font-size:40px;font-weight:900;letter-spacing:12px;
                    color:#1A1A2E;font-family:'Courier New',monospace;">
          ${otp}
</div>
<div style="color:#6B7280;font-size:12px;margin-top:8px;">
          Valid for ${expiryMinutes} minutes only
</div>
</div>
</div>
<div style="background:#FEF3C7;border-left:4px solid #D97706;
                padding:12px 16px;border-radius:0 6px 6px 0;margin:20px 0;">
      ⚠️ Never share this OTP with anyone. Our team will never ask for it.
</div>
<p>If you did not request this, please ignore this email.
       Your account remains secure.</p>
</div>
</div>`;

exports.passwordResetSuccess = ({ userName }) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
<div style="background:#06864B;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
<h2 style="color:#fff;margin:0;">✅ Password Reset Successful</h2>
</div>
<div style="background:#fff;padding:28px;border:1px solid #e5e7eb;
              border-radius:0 0 8px 8px;">
<p>Hi <strong>${userName}</strong>,</p>
<p>Your password has been successfully reset. You can now log in with your new password.</p>
<a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/login"
       style="background:#06864B;color:#fff;padding:12px 28px;border-radius:6px;
              text-decoration:none;display:inline-block;margin-top:8px;font-weight:700;">
       Log In Now
</a>
<p style="color:#DC2626;margin-top:20px;">
      If you did NOT reset your password, contact support immediately at
<a href="mailto:support@smartlocalservices.com">support@smartlocalservices.com</a>
</p>
</div>
</div>`;



/* ─── Shared base wrapper ─── */
const base = (title, body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body  { margin:0; padding:0; background:#F3F4F6; font-family:Arial,sans-serif; }
    .wrap { max-width:560px; margin:32px auto; background:#fff; border-radius:12px;
            overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.08); }
    .hdr  { background:linear-gradient(135deg,#FF8C00,#FF5F00); padding:28px 32px; }
    .hdr h1 { margin:0; color:#fff; font-size:22px; }
    .hdr p  { margin:4px 0 0; color:rgba(255,255,255,.85); font-size:13px; }
    .body { padding:28px 32px; color:#374151; font-size:14px; line-height:1.7; }
    .otp  { display:block; letter-spacing:14px; font-size:38px; font-weight:800;
            color:#1F2937; text-align:center; padding:20px; margin:20px 0;
            background:#F9FAFB; border:2px dashed #E5E7EB; border-radius:10px; }
    .btn  { display:inline-block; padding:12px 28px; background:#FF8C00;
            color:#fff; border-radius:8px; text-decoration:none; font-weight:700; }
    .note { margin-top:20px; padding:14px; background:#FFF7ED;
            border-left:4px solid #FF8C00; border-radius:4px;
            font-size:13px; color:#92400E; }
    .foot { padding:16px 32px; background:#F9FAFB; color:#9CA3AF;
            font-size:12px; text-align:center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr"><h1>⚡ LocalServe</h1><p>${title}</p></div>
    <div class="body">${body}</div>
    <div class="foot">© ${new Date().getFullYear()} LocalServe · All rights reserved</div>
  </div>
</body>
</html>`;

/* ─── Templates ─── */
exports.passwordResetSuccess = ({ userName }) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
<div style="background:#06864B;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
<h2 style="color:#fff;margin:0;">✅ Password Reset Successful</h2>
</div>
<div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
<p>Hi <strong>${userName}</strong>,</p>
<p>Your password has been successfully reset. You can now log in with your new password.</p>

<a href="${process.env.FRONTEND_URL}/login"
style="background:#06864B;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">
Log In Now
</a>

<p style="margin-top:20px;color:#6B7280;font-size:12px;">
If you did not perform this action, please contact support immediately.
</p>

</div>
</div>`;


// emailTemplates.js — add this
exports.complaintStatusUpdate = ({ userName, status, adminMessage, complaintId }) =>
  baseTemplate(
    `
    ${heroIcon("📋")}
    ${sectionTitle("Complaint Update", `Your complaint status has changed.`)}

    ${detailCard([
      infoRow("Complaint ID", `#${String(complaintId).slice(-8).toUpperCase()}`),
      infoRow("New Status", statusBadge(status,
        status === "Resolved" ? BRAND.success :
        status === "Rejected" ? BRAND.danger  : BRAND.warning
      )),
    ])}

    ${alertBox(adminMessage, BRAND.primary, "💬")}

    <p style="color:${BRAND.muted};font-size:13px;line-height:1.7;margin:20px 0 0;">
      Hi <strong style="color:${BRAND.dark};">${userName}</strong>, our team has reviewed your complaint
      and updated its status. If you have further questions, please reach out to support.
    </p>
  `,
    `Your complaint has been updated to: ${status}.`,
  );