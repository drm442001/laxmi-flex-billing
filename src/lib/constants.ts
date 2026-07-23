import { E } from "@/components/emojis";
// ============================================
// RE-EXPORT TYPES
// ============================================
export * from "./types";

// ============================================
// CONSTANTS
// ============================================

export const CATEGORIES = [
  { value: "print" as const, label: "Print" },
  { value: "frame" as const, label: "Frame" },
  { value: "other" as const, label: "Other" },
];

export const DOCUMENT_TYPES = [
  { value: "invoice" as const, label: "Invoice" },
  { value: "quotation" as const, label: "Quotation" },
  { value: "calculation" as const, label: "Calculation" },
];

export const INVOICE_TYPES = [
  { value: "normal" as const, label: "Normal Invoice", description: "Simple invoice without GST" },
  { value: "tax" as const, label: "Tax Invoice", description: "GST invoice with CGST/SGST" },
];

export const PAYMENT_METHODS = [
  { value: "cash" as const, label: "Cash" },
  { value: "upi" as const, label: "UPI" },
  { value: "bank" as const, label: "Bank Transfer" },
  { value: "cheque" as const, label: "Cheque" },
  { value: "other" as const, label: "Other" },
];

export const PAYMENT_STATUSES = [
  { value: "unpaid" as const, label: "Unpaid", color: "red" },
  { value: "partial" as const, label: "Partial", color: "yellow" },
  { value: "paid" as const, label: "Paid", color: "green" },
];

export const USER_ROLES = [
  { value: "admin" as const, label: "Admin", permissions: "all" },
  { value: "staff" as const, label: "Staff", permissions: "create,edit,view" },
  { value: "viewer" as const, label: "Viewer", permissions: "view" },
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli",
  "Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export const PRINT_ITEMS = [
  { name: "Normal Flex", hsn: "4911", rate: 0 },
  { name: "Star Flex", hsn: "4911", rate: 0 },
  { name: "Back Light Flex", hsn: "4911", rate: 0 },
  { name: "Vinyl", hsn: "3919", rate: 0 },
  { name: "One Way Vision", hsn: "3919", rate: 0 },
  { name: "Vinyl With Foam 3mm", hsn: "3919", rate: 0 },
  { name: "Vinyl With Foam 5mm", hsn: "3919", rate: 0 },
  { name: "Foam Sheet 3mm", hsn: "3921", rate: 0 },
  { name: "Foam Sheet 5mm", hsn: "3921", rate: 0 },
  { name: "Back Light Completed Box", hsn: "9405", rate: 0 },
];

export const FRAME_ITEMS = [
  { name: "MS Frame Light", hsn: "7308", rate: 0 },
  { name: "MS Frame Heavy", hsn: "7308", rate: 0 },
  { name: "MS Standing Frame", hsn: "7308", rate: 0 },
  { name: "Back Light Box Frame", hsn: "7308", rate: 0 },
];

export const OTHER_ITEMS = [
  { name: "Graphics Design", hsn: "9983", rate: 0 },
  { name: "Calender Pocketing With PVC Pipe", hsn: "3917", rate: 0 },
  { name: "Calender Pocketing With Stick", hsn: "3917", rate: 0 },
  { name: "Flex-Banner Pasting", hsn: "9988", rate: 0 },
  { name: "Flex-Banner Fitting", hsn: "9988", rate: 0 },
  { name: "Transportation Fare", hsn: "9965", rate: 0 },
  { name: "Other", hsn: "", rate: 0 },
];

export const EXPENSE_CATEGORIES = [
  "Rent", "Electricity", "Salary", "Printing Materials", "Ink & Solvent",
  "Transport", "Maintenance", "Office Supplies", "Marketing", "Telephone",
  "Internet", "Insurance", "Bank Charges", "Legal Fees", "Miscellaneous"
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getItemsByCategory(category: string) {
  switch (category) {
    case "print": return PRINT_ITEMS;
    case "frame": return FRAME_ITEMS;
    case "other": return OTHER_ITEMS;
    default: return [];
  }
}

export function calculatePrint(
  width: number,
  height: number,
  quantity: number,
  rate: number
): { totalFit: number; amount: number } {
  const totalFit = width * height * quantity;
  const amount = totalFit * rate;
  return {
    totalFit: parseFloat(totalFit.toFixed(2)),
    amount: parseFloat(amount.toFixed(2))
  };
}

export function calculateFrame(
  width: number,
  wSupport: number,
  height: number,
  hSupport: number,
  quantity: number,
  rate: number
): { totalFit: number; amount: number } {
  const widthCalc = (!wSupport || wSupport === 0) ? width * 2 : (wSupport + 2) * width;
  const heightCalc = (!hSupport || hSupport === 0) ? height * 2 : (hSupport + 2) * height;
  const totalFit = (widthCalc + heightCalc) * quantity;
  const amount = totalFit * rate;
  return {
    totalFit: parseFloat(totalFit.toFixed(2)),
    amount: parseFloat(amount.toFixed(2))
  };
}

export function parseSize(size: string): { width: number; height: number } | null {
  const match = size.match(/^\s*(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)\s*$/);
  if (match) {
    return { width: parseFloat(match[1]), height: parseFloat(match[2]) };
  }
  return null;
}

export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 3) { // April onwards
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}

// Client-side placeholder only. The authoritative invoice number is generated
// server-side (race-safe via SELECT ... FOR UPDATE on company_settings.counter).
export function generateInvoiceNumber(
  type: string = "invoice",
  prefix?: string,
  counter?: number
): string {
  const now = new Date();
  const fy = getFinancialYear(now);
  const pre = prefix || (type === "invoice" ? "INV" : type === "quotation" ? "QUO" : "CAL");
  // Use a clearly-temporary placeholder to avoid misleading the user.
  const num = counter ?? Math.floor(Math.random() * 9000) + 1000;
  return `${pre}/${fy}/${num.toString().padStart(4, "0")}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateForInput(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toISOString().split("T")[0];
}

// ============================================
// NUMBER TO WORDS (Indian Format)
// ============================================

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convertLessThanThousand(num: number): string {
  if (num === 0) return "";
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + convertLessThanThousand(num % 100) : "");
}

export function numberToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  
  let rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let words = "";
  
  if (rupees >= 10000000) {
    words += convertLessThanThousand(Math.floor(rupees / 10000000)) + " Crore ";
    rupees = rupees % 10000000;
  }
  if (rupees >= 100000) {
    words += convertLessThanThousand(Math.floor(rupees / 100000)) + " Lakh ";
  }
  const remaining = rupees % 100000;
  if (remaining >= 1000) {
    words += convertLessThanThousand(Math.floor(remaining / 1000)) + " Thousand ";
  }
  const last = remaining % 1000;
  if (last > 0) {
    words += convertLessThanThousand(last);
  }
  
  words = words.trim() + " Rupees";
  
  if (paise > 0) {
    words += " and " + convertLessThanThousand(paise) + " Paise";
  }
  
  return words + " Only";
}

// ============================================
// GST CALCULATION
// ============================================

export function calculateGST(
  amount: number,
  gstPercent: number,
  isSameState: boolean = true
) {
  const gstAmount = (amount * gstPercent) / 100;
  
  if (isSameState) {
    const halfGst = gstAmount / 2;
    return {
      cgstPercent: gstPercent / 2,
      cgstAmount: parseFloat(halfGst.toFixed(2)),
      sgstPercent: gstPercent / 2,
      sgstAmount: parseFloat(halfGst.toFixed(2)),
      igstPercent: 0,
      igstAmount: 0,
      totalGst: parseFloat(gstAmount.toFixed(2)),
    };
  } else {
    return {
      cgstPercent: 0,
      cgstAmount: 0,
      sgstPercent: 0,
      sgstAmount: 0,
      igstPercent: gstPercent,
      igstAmount: parseFloat(gstAmount.toFixed(2)),
      totalGst: parseFloat(gstAmount.toFixed(2)),
    };
  }
}