"use strict";

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/* ─────────────────────────────────────────────
   Brand Config
───────────────────────────────────────────── */

const BRAND = {
  name: "Smart Local Services",
  tagline: "Connecting You to Local Experts",
  logo: path.join(__dirname, "../assets/logo.png"),

  supportEmail: "support@smartlocalservices.in",
  website: "www.smartlocalservices.in",
  phone: "+91 98765 43210",
  address: "MG Road, Pune, Maharashtra 411001, India",
  gst: "GSTIN: 27AABCU9603R1ZV",

  primary: "#FF8C00",
  accent: "#FFF8E7",
  dark: "#1A1209",
  muted: "#A89070",
  border: "#F0E4C8",
  white: "#FFFFFF",
  success: "#22C55E",
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

const hex2rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const fillColor = (doc, hex) => doc.fillColor(hex2rgb(hex));
const strokeColor = (doc, hex) => doc.strokeColor(hex2rgb(hex));

const drawRect = (doc, x, y, w, h, hex, radius = 0) => {
  fillColor(doc, hex);
  radius
    ? doc.roundedRect(x, y, w, h, radius).fill()
    : doc.rect(x, y, w, h).fill();
};

const hrLine = (doc, y, color = BRAND.border) => {
  strokeColor(doc, color);
  doc.moveTo(50, y).lineTo(545, y).lineWidth(0.7).stroke();
};

const formatCurrency = (amount) =>
  `Rs. ${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  })}`;

const formatDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

const invoiceNumber = (id) =>
  `INV-${String(id).slice(-8).toUpperCase()}`;

/* ─────────────────────────────────────────────
   HEADER (Logo + Company Info)
───────────────────────────────────────────── */

const drawHeader = (doc) => {
  drawRect(doc, 0, 0, 595, 90, "#FF5F00");
  drawRect(doc, 0, 0, 595, 72, "#FF8C00");

  /* Logo container */
  drawRect(doc, 40, 14, 62, 62, BRAND.white, 8);

  /* Safe logo loading */
  try {
    if (fs.existsSync(BRAND.logo)) {
      doc.image(BRAND.logo, 46, 20, {
        fit: [50, 50],
        align: "center",
        valign: "center",
      });
    }
  } catch (err) {
    console.log("Logo load error:", err.message);
  }

  /* Company name */
  fillColor(doc, BRAND.dark);
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(BRAND.name, 115, 22);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillOpacity(0.7)
    .text(BRAND.tagline, 115, 44);

  doc.fillOpacity(1);

  /* Invoice title */
  fillColor(doc, "#FFD400");
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .text("INVOICE", 390, 28, { align: "right", width: 155 });
};

/* ─────────────────────────────────────────────
   BILL TO + INVOICE META
───────────────────────────────────────────── */

const drawMetaBlock = (doc, booking, customer) => {
  const y = 108;

  drawRect(doc, 40, y, 240, 100, BRAND.accent, 6);

  fillColor(doc, BRAND.muted);
  doc.fontSize(8).font("Helvetica-Bold").text("BILL TO", 54, y + 12);

  fillColor(doc, BRAND.dark);
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(customer.name, 54, y + 25);

  fillColor(doc, BRAND.muted);
  doc
    .fontSize(9)
    .font("Helvetica")
    .text(customer.email, 54, y + 41);

  if (customer.phone)
    doc.text(customer.phone, 54, y + 55);

  if (customer.address)
    doc.text(customer.address, 54, y + 69, { width: 210 });

  /* Right side details */

  const invoiceNo = invoiceNumber(booking._id);

  const details = [
    ["Invoice No.", invoiceNo],
    ["Issue Date", formatDate()],
    ["Due Date", formatDate(Date.now() + 604800000)],
    ["GST", BRAND.gst.replace("GSTIN: ", "")],
  ];

  let ry = y + 10;

  details.forEach(([label, value]) => {
    fillColor(doc, BRAND.muted);
    doc.fontSize(9).text(label, 355, ry);

    fillColor(doc, BRAND.dark);
    doc.text(value, 440, ry);

    ry += 18;
  });

  drawRect(doc, 355, ry + 2, 75, 20, BRAND.primary, 10);

  fillColor(doc, BRAND.dark);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("ISSUED", 360, ry + 6);
};

/* ─────────────────────────────────────────────
   SERVICE TABLE
───────────────────────────────────────────── */

const drawLineItems = (doc, booking, provider) => {
  const tableTop = 242;

  drawRect(doc, 40, tableTop, 505, 26, BRAND.primary, 4);

  fillColor(doc, BRAND.dark);

  doc.fontSize(8).font("Helvetica-Bold");

  doc.text("SERVICE DESCRIPTION", 54, tableTop + 8);
  doc.text("PROVIDER", 274, tableTop + 8);
  doc.text("DATE", 380, tableTop + 8);
  doc.text("AMOUNT", 466, tableTop + 8, { align: "right", width: 80 });

  const rowY = tableTop + 36;

  fillColor(doc, BRAND.dark);

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(booking.serviceName || "Service", 54, rowY);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(BRAND.muted)
    .text(booking.serviceDescription || "", 54, rowY + 14, {
      width: 210,
    });

  fillColor(doc, BRAND.dark);

  doc.text(provider.name, 274, rowY);

  doc.text(
    formatDate(booking.serviceDate || new Date()),
    380,
    rowY,
  );

  doc
    .font("Helvetica-Bold")
    .text(formatCurrency(booking.totalAmount), 466, rowY, {
      align: "right",
      width: 80,
    });

  hrLine(doc, rowY + 36);

  return rowY + 50;
};

/* ─────────────────────────────────────────────
   NOTES
───────────────────────────────────────────── */

const drawNotes = (doc, y) => {
  drawRect(doc, 40, y, 505, 60, BRAND.accent, 6);

  fillColor(doc, BRAND.muted);

  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("PAYMENT INSTRUCTIONS", 54, y + 10);

  fillColor(doc, BRAND.dark);

  doc
    .fontSize(9)
    .font("Helvetica")
    .text(
      "Payment is due within 7 days. Accepted: UPI, Net Banking, Cards.",
      54,
      y + 22,
      { width: 477 },
    );
};

/* ─────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────── */

const drawFooter = (doc) => {
  const fy = 770;

  drawRect(doc, 0, fy, 595, 72, "#FF5F00");

  fillColor(doc, BRAND.dark);

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Questions about this invoice?", 50, fy + 12);

  doc
    .fontSize(8)
    .font("Helvetica")
    .text(
      `Email: ${BRAND.supportEmail} | Phone: ${BRAND.phone}`,
      50,
      fy + 26,
    );

  doc
    .fontSize(8)
    .text(BRAND.website, 390, fy + 12, {
      align: "right",
      width: 155,
    });

  doc
    .text(BRAND.address, 390, fy + 26, {
      align: "right",
      width: 155,
    });
};

/* ─────────────────────────────────────────────
   MAIN FUNCTION
───────────────────────────────────────────── */

const generateInvoice = (booking, customer, provider) => {
  return new Promise((resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, "../invoices");

      if (!fs.existsSync(invoicesDir))
        fs.mkdirSync(invoicesDir, { recursive: true });

      const filePath = path.join(
        invoicesDir,
        `invoice-${booking._id}.pdf`,
      );

      const doc = new PDFDocument({ size: "A4", margin: 0 });

      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      drawHeader(doc);
      drawMetaBlock(doc, booking, customer);

      const afterTable = drawLineItems(doc, booking, provider);

      drawNotes(doc, afterTable + 10);

      drawFooter(doc);

      doc.end();

      stream.on("finish", () => resolve(filePath));

      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = generateInvoice;