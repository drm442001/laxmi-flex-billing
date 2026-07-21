// ============================================
// CORE TYPES — Only types actually used in the codebase
// ============================================

export type UserRole = "admin" | "staff" | "viewer";
export type Category = "print" | "frame" | "other";
export type DocumentType = "invoice" | "quotation" | "calculation";
export type InvoiceType = "normal" | "tax";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cash" | "upi" | "bank" | "cheque" | "other";

// ============================================
// LINE ITEM — Used by CategoryForm, ItemsList, SummarySection, invoiceTemplate
// ============================================

export interface LineItem {
  id: string;
  srNo: number;
  category: Category;
  description: string;
  hsnCode?: string;
  width: number;
  wSupport: number;
  height: number;
  hSupport: number;
  size: string;
  quantity: number;
  totalFit: number;
  unit: string;
  rate: number;
  amount: number;
  gstPercent?: number;
  gstAmount?: number;
}