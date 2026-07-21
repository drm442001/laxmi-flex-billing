import { LineItem, formatNumber, numberToWords, formatDate } from "./constants";

// ============================================
// INVOICE TEMPLATE ENGINE
// ============================================

export interface InvoiceTemplateData {
  // Document Info
  invoiceNumber: string;
  invoiceType: "normal" | "tax";
  invoiceDate: string;
  dueDate?: string;
  financialYear?: string;
  
  // Company Info (from settings)
  company: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    mobile: string;
    email: string;
    website: string;
    gstNumber: string;
    panNumber: string;
    bankName: string;
    bankBranch: string;
    accountNumber: string;
    ifscCode: string;
    upiId: string;
    logoUrl: string;
    qrCodeUrl: string;
    signatureUrl: string;
  };
  
  // Customer Info
  customer: {
    name: string;
    address: string;
    phone: string;
    gstNumber?: string;
    state?: string;
  };
  
  // Items
  items: LineItem[];
  
  // Totals
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
  
  // Payment Info
  paidAmount: number;
  balanceAmount: number;
  
  // Additional
  notes?: string;
  termsConditions?: string;
}

// ============================================
// NORMAL INVOICE TEMPLATE (A5)
// ============================================

export function generateNormalInvoiceHTML(data: InvoiceTemplateData): string {
  const itemsHTML = data.items.map((item, index) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;">${index + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;">
        ${item.description}
        ${item.size ? `<br><span style="color:#666;font-size:10px;">(${item.size})</span>` : ""}
      </td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;">${item.width || "-"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;">${item.height || "-"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;">${item.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:11px;">${item.totalFit > 0 ? `${formatNumber(item.totalFit)} ${item.unit}` : "-"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:11px;">₹${formatNumber(item.rate)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:11px;font-weight:600;">₹${formatNumber(item.amount)}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    @page { size: A5 portrait; margin: 8mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1f2937; background: #fff; }
    .invoice-container { width: 148mm; min-height: 210mm; margin: 0 auto; padding: 8mm; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin-bottom: 10px; }
    .company-info { flex: 1; }
    .company-name { font-size: 18px; font-weight: 700; color: #1e40af; margin-bottom: 2px; }
    .company-tagline { font-size: 10px; color: #6b7280; }
    .company-contact { font-size: 9px; color: #374151; margin-top: 4px; line-height: 1.4; }
    .logo-section { text-align: right; }
    .logo-section img { max-height: 45px; }
    .invoice-title { background: #1e40af; color: #fff; text-align: center; padding: 6px; font-size: 14px; font-weight: 700; letter-spacing: 1px; margin-bottom: 10px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
    .info-box { flex: 1; border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px; background: #f9fafb; }
    .info-box-title { font-size: 9px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
    .info-box-content { font-size: 11px; font-weight: 500; color: #111827; }
    .info-box-content small { font-size: 9px; color: #6b7280; display: block; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .items-table th { background: #1e40af; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 600; }
    .items-table th:first-child { border-radius: 4px 0 0 0; }
    .items-table th:last-child { border-radius: 0 4px 0 0; text-align: right; }
    .totals-section { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .amount-words { flex: 1; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb; margin-right: 10px; }
    .amount-words-label { font-size: 9px; color: #6b7280; text-transform: uppercase; }
    .amount-words-value { font-size: 10px; font-weight: 500; color: #111827; font-style: italic; }
    .totals-box { width: 180px; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
    .total-row.grand { background: #1e40af; color: #fff; padding: 6px 8px; border-radius: 4px; font-weight: 700; font-size: 12px; margin-top: 4px; }
    .bank-qr-section { display: flex; gap: 10px; margin-bottom: 8px; }
    .bank-details { flex: 1; border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px; font-size: 9px; }
    .bank-details-title { font-weight: 600; color: #1e40af; margin-bottom: 4px; font-size: 10px; }
    .qr-section { width: 70px; text-align: center; }
    .qr-section img { width: 60px; height: 60px; border: 1px solid #e5e7eb; }
    .qr-section p { font-size: 8px; color: #6b7280; margin-top: 2px; }
    .footer-section { display: flex; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    .terms { flex: 1; font-size: 8px; color: #6b7280; line-height: 1.3; }
    .terms-title { font-weight: 600; color: #374151; margin-bottom: 2px; }
    .signature { width: 100px; text-align: center; }
    .signature img { max-height: 30px; margin-bottom: 4px; }
    .signature-line { border-top: 1px solid #374151; padding-top: 4px; font-size: 9px; font-weight: 600; }
    .footer-note { text-align: center; margin-top: 8px; font-size: 9px; color: #1e40af; font-weight: 500; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">${data.company.name}</div>
        <div class="company-tagline">Flex Banner Printing & Framing</div>
        <div class="company-contact">
          ${data.company.address ? `${data.company.address}, ` : ""}${data.company.city}, ${data.company.state} ${data.company.pincode}<br>
          ${data.company.mobile ? `📱 ${data.company.mobile}` : ""} ${data.company.phone ? `☎ ${data.company.phone}` : ""}<br>
          ${data.company.email ? `✉ ${data.company.email}` : ""}
        </div>
      </div>
      <div class="logo-section">
        ${data.company.logoUrl ? `<img src="${data.company.logoUrl}" alt="Logo">` : ""}
      </div>
    </div>
    
    <!-- Invoice Title -->
    <div class="invoice-title">INVOICE</div>
    
    <!-- Invoice & Customer Info -->
    <div class="info-row">
      <div class="info-box">
        <div class="info-box-title">Invoice Details</div>
        <div class="info-box-content">
          <strong>#${data.invoiceNumber}</strong><br>
          <small>Date: ${formatDate(data.invoiceDate)}</small>
          ${data.dueDate ? `<small>Due: ${formatDate(data.dueDate)}</small>` : ""}
        </div>
      </div>
      <div class="info-box" style="flex:2;">
        <div class="info-box-title">Bill To</div>
        <div class="info-box-content">
          <strong>${data.customer.name || "Cash Customer"}</strong>
          ${data.customer.address ? `<small>${data.customer.address}</small>` : ""}
          ${data.customer.phone ? `<small>📱 ${data.customer.phone}</small>` : ""}
        </div>
      </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:25px;text-align:center;">#</th>
          <th>Description</th>
          <th style="width:35px;text-align:center;">W</th>
          <th style="width:35px;text-align:center;">H</th>
          <th style="width:30px;text-align:center;">Qty</th>
          <th style="width:60px;text-align:right;">Total Fit</th>
          <th style="width:55px;text-align:right;">Rate</th>
          <th style="width:65px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
    
    <!-- Totals Section -->
    <div class="totals-section">
      <div class="amount-words">
        <div class="amount-words-label">Amount in Words</div>
        <div class="amount-words-value">${data.amountInWords || numberToWords(data.grandTotal)}</div>
      </div>
      <div class="totals-box">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>₹${formatNumber(data.subtotal)}</span>
        </div>
        ${data.discountAmount > 0 ? `
        <div class="total-row" style="color:#dc2626;">
          <span>Discount (${data.discountPercent}%):</span>
          <span>- ₹${formatNumber(data.discountAmount)}</span>
        </div>` : ""}
        ${data.roundOff !== 0 ? `
        <div class="total-row">
          <span>Round Off:</span>
          <span>${data.roundOff > 0 ? "+" : ""}₹${formatNumber(data.roundOff)}</span>
        </div>` : ""}
        <div class="total-row grand">
          <span>Grand Total:</span>
          <span>₹${formatNumber(data.grandTotal)}</span>
        </div>
        ${data.paidAmount > 0 ? `
        <div class="total-row" style="color:#16a34a;">
          <span>Paid:</span>
          <span>₹${formatNumber(data.paidAmount)}</span>
        </div>
        <div class="total-row" style="color:#dc2626;font-weight:600;">
          <span>Balance:</span>
          <span>₹${formatNumber(data.balanceAmount)}</span>
        </div>` : ""}
      </div>
    </div>
    
    <!-- Bank & QR Section -->
    <div class="bank-qr-section">
      <div class="bank-details">
        <div class="bank-details-title">🏦 Bank Details</div>
        <strong>${data.company.bankName || "Bank Name"}</strong><br>
        Branch: ${data.company.bankBranch || "-"}<br>
        A/C No: ${data.company.accountNumber || "-"}<br>
        IFSC: ${data.company.ifscCode || "-"}<br>
        ${data.company.upiId ? `UPI: ${data.company.upiId}` : ""}
      </div>
      <div class="qr-section">
        ${data.company.qrCodeUrl ? `<img src="${data.company.qrCodeUrl}" alt="QR Code"><p>Scan to Pay</p>` : ""}
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer-section">
      <div class="terms">
        <div class="terms-title">Terms & Conditions</div>
        ${data.termsConditions || data.notes || "1. Goods once sold will not be taken back.<br>2. Payment due within 15 days.<br>3. Subject to Wardha jurisdiction."}
      </div>
      <div class="signature">
        ${data.company.signatureUrl ? `<img src="${data.company.signatureUrl}" alt="Signature">` : ""}
        <div class="signature-line">Authorised Signatory</div>
      </div>
    </div>
    
    <div class="footer-note">Thank you for your business!</div>
  </div>
</body>
</html>`;
}

// ============================================
// TAX INVOICE TEMPLATE (A5 with GST)
// ============================================

export function generateTaxInvoiceHTML(data: InvoiceTemplateData): string {
  const isSameState = (data.customer.state || "Maharashtra") === (data.company.state || "Maharashtra");
  
  const itemsHTML = data.items.map((item, index) => `
    <tr>
      <td style="padding:5px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px;">${index + 1}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #e5e7eb;font-size:10px;">
        ${item.description}
        ${item.hsnCode ? `<br><span style="color:#666;font-size:9px;">HSN: ${item.hsnCode}</span>` : ""}
      </td>
      <td style="padding:5px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px;">${item.quantity}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:10px;">${item.totalFit > 0 ? `${formatNumber(item.totalFit)} ${item.unit}` : "-"}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:10px;">₹${formatNumber(item.rate)}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:10px;font-weight:600;">₹${formatNumber(item.amount)}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice ${data.invoiceNumber}</title>
  <style>
    @page { size: A5 portrait; margin: 6mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1f2937; background: #fff; }
    .invoice-container { width: 148mm; min-height: 210mm; margin: 0 auto; padding: 6mm; background: #fff; border: 1px solid #e5e7eb; }
    .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 6px; margin-bottom: 8px; }
    .company-name { font-size: 16px; font-weight: 700; color: #1e40af; }
    .company-address { font-size: 9px; color: #374151; margin: 2px 0; }
    .company-gst { font-size: 10px; font-weight: 600; color: #dc2626; }
    .invoice-title { background: linear-gradient(135deg, #1e40af, #3b82f6); color: #fff; text-align: center; padding: 5px; font-size: 13px; font-weight: 700; letter-spacing: 2px; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .info-box { border: 1px solid #e5e7eb; padding: 6px; border-radius: 3px; font-size: 9px; }
    .info-box-title { font-weight: 600; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; margin-bottom: 4px; font-size: 9px; text-transform: uppercase; }
    .info-row { display: flex; justify-content: space-between; margin: 2px 0; }
    .info-row span:first-child { color: #6b7280; }
    .info-row span:last-child { font-weight: 500; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .items-table th { background: #1e40af; color: #fff; padding: 5px 6px; text-align: left; font-size: 9px; font-weight: 600; }
    .items-table th:first-child { border-radius: 3px 0 0 0; }
    .items-table th:last-child { border-radius: 0 3px 0 0; text-align: right; }
    .totals-grid { display: grid; grid-template-columns: 1fr 150px; gap: 8px; margin-bottom: 6px; }
    .amount-words { padding: 6px; border: 1px solid #e5e7eb; border-radius: 3px; background: #f9fafb; }
    .amount-words-label { font-size: 8px; color: #6b7280; text-transform: uppercase; }
    .amount-words-value { font-size: 9px; font-weight: 500; font-style: italic; }
    .totals-box { border: 1px solid #e5e7eb; border-radius: 3px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 6px; font-size: 9px; border-bottom: 1px solid #f3f4f6; }
    .total-row.gst { background: #fef3c7; }
    .total-row.grand { background: #1e40af; color: #fff; font-weight: 700; font-size: 11px; border: none; }
    .gst-summary { border: 1px solid #e5e7eb; border-radius: 3px; margin-bottom: 6px; overflow: hidden; }
    .gst-summary-title { background: #fef3c7; padding: 4px 6px; font-weight: 600; font-size: 9px; color: #92400e; }
    .gst-summary-row { display: flex; justify-content: space-between; padding: 3px 6px; font-size: 9px; border-bottom: 1px solid #f3f4f6; }
    .bank-signature { display: flex; gap: 8px; margin-top: 6px; }
    .bank-details { flex: 1; border: 1px solid #e5e7eb; padding: 6px; border-radius: 3px; font-size: 8px; }
    .bank-title { font-weight: 600; color: #1e40af; margin-bottom: 3px; font-size: 9px; }
    .signature-box { width: 90px; text-align: center; border: 1px solid #e5e7eb; padding: 6px; border-radius: 3px; }
    .signature-box img { max-height: 25px; margin-bottom: 3px; }
    .signature-line { border-top: 1px solid #374151; padding-top: 3px; font-size: 8px; font-weight: 600; }
    .footer { text-align: center; margin-top: 6px; font-size: 8px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 4px; }
    .footer strong { color: #1e40af; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-name">${data.company.name}</div>
      <div class="company-address">
        ${data.company.address ? `${data.company.address}, ` : ""}${data.company.city}, ${data.company.state} ${data.company.pincode}<br>
        📱 ${data.company.mobile || data.company.phone} | ✉ ${data.company.email || "-"}
      </div>
      <div class="company-gst">GSTIN: ${data.company.gstNumber || "Not Registered"} | PAN: ${data.company.panNumber || "-"}</div>
    </div>
    
    <!-- Invoice Title -->
    <div class="invoice-title">TAX INVOICE</div>
    
    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">Invoice Details</div>
        <div class="info-row"><span>Invoice No:</span><span><strong>${data.invoiceNumber}</strong></span></div>
        <div class="info-row"><span>Date:</span><span>${formatDate(data.invoiceDate)}</span></div>
        ${data.dueDate ? `<div class="info-row"><span>Due Date:</span><span>${formatDate(data.dueDate)}</span></div>` : ""}
        <div class="info-row"><span>Place of Supply:</span><span>${data.company.state}</span></div>
      </div>
      <div class="info-box">
        <div class="info-box-title">Bill To</div>
        <strong style="font-size:10px;">${data.customer.name || "Cash Customer"}</strong><br>
        ${data.customer.address || "-"}<br>
        📱 ${data.customer.phone || "-"}<br>
        ${data.customer.gstNumber ? `<span style="color:#dc2626;">GSTIN: ${data.customer.gstNumber}</span>` : ""}
      </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:20px;text-align:center;">#</th>
          <th>Description / HSN</th>
          <th style="width:30px;text-align:center;">Qty</th>
          <th style="width:55px;text-align:right;">Total</th>
          <th style="width:50px;text-align:right;">Rate</th>
          <th style="width:60px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
    
    <!-- GST Summary -->
    <div class="gst-summary">
      <div class="gst-summary-title">GST Summary</div>
      <div class="gst-summary-row"><span>Taxable Amount:</span><span>₹${formatNumber(data.taxableAmount || data.subtotal - data.discountAmount)}</span></div>
      ${isSameState ? `
      <div class="gst-summary-row"><span>CGST @ ${data.cgstPercent}%:</span><span>₹${formatNumber(data.cgstAmount)}</span></div>
      <div class="gst-summary-row"><span>SGST @ ${data.sgstPercent}%:</span><span>₹${formatNumber(data.sgstAmount)}</span></div>
      ` : `
      <div class="gst-summary-row"><span>IGST @ ${data.igstPercent}%:</span><span>₹${formatNumber(data.igstAmount)}</span></div>
      `}
      <div class="gst-summary-row" style="font-weight:600;background:#fef3c7;"><span>Total GST:</span><span>₹${formatNumber(data.cgstAmount + data.sgstAmount + data.igstAmount)}</span></div>
    </div>
    
    <!-- Totals -->
    <div class="totals-grid">
      <div class="amount-words">
        <div class="amount-words-label">Amount in Words</div>
        <div class="amount-words-value">${data.amountInWords || numberToWords(data.grandTotal)}</div>
      </div>
      <div class="totals-box">
        <div class="total-row"><span>Subtotal:</span><span>₹${formatNumber(data.subtotal)}</span></div>
        ${data.discountAmount > 0 ? `<div class="total-row"><span>Discount:</span><span>- ₹${formatNumber(data.discountAmount)}</span></div>` : ""}
        <div class="total-row gst"><span>Total GST:</span><span>₹${formatNumber(data.cgstAmount + data.sgstAmount + data.igstAmount)}</span></div>
        ${data.roundOff !== 0 ? `<div class="total-row"><span>Round Off:</span><span>₹${formatNumber(data.roundOff)}</span></div>` : ""}
        <div class="total-row grand"><span>Grand Total:</span><span>₹${formatNumber(data.grandTotal)}</span></div>
      </div>
    </div>
    
    <!-- Bank & Signature -->
    <div class="bank-signature">
      <div class="bank-details">
        <div class="bank-title">🏦 Bank Details for NEFT/RTGS</div>
        <strong>${data.company.bankName || "-"}</strong>, ${data.company.bankBranch || "-"}<br>
        A/C: ${data.company.accountNumber || "-"} | IFSC: ${data.company.ifscCode || "-"}<br>
        ${data.company.upiId ? `UPI: ${data.company.upiId}` : ""}
      </div>
      ${data.company.qrCodeUrl ? `
      <div style="width:55px;text-align:center;">
        <img src="${data.company.qrCodeUrl}" style="width:50px;height:50px;border:1px solid #e5e7eb;">
        <div style="font-size:7px;color:#666;">Scan to Pay</div>
      </div>` : ""}
      <div class="signature-box">
        ${data.company.signatureUrl ? `<img src="${data.company.signatureUrl}" alt="Signature">` : "<div style='height:25px;'></div>"}
        <div class="signature-line">Authorised Signatory</div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <strong>Thank you for your business!</strong><br>
      This is a computer generated invoice. Subject to ${data.company.city || "Wardha"} jurisdiction.
    </div>
  </div>
</body>
</html>`;
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export function generateInvoiceHTML(data: InvoiceTemplateData): string {
  if (data.invoiceType === "tax") {
    return generateTaxInvoiceHTML(data);
  }
  return generateNormalInvoiceHTML(data);
}

// ============================================
// PRINT FUNCTION
// ============================================

export function printInvoice(data: InvoiceTemplateData) {
  const html = generateInvoiceHTML(data);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}