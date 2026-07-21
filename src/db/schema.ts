import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  boolean,
  date,
  index,
} from "drizzle-orm/pg-core";

// ============================================
// USERS & AUTHENTICATION
// ============================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // hashed
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"), // 'admin' | 'staff' | 'viewer'
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  module: text("module").notNull(),
  recordId: integer("record_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("activity_user_idx").on(table.userId),
  moduleIdx: index("activity_module_idx").on(table.module),
}));

// ============================================
// COMPANY SETTINGS
// ============================================

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("Laxmi Flex Printers"),
  ownerName: text("owner_name"),
  address: text("address"),
  city: text("city").default("Wardha"),
  state: text("state").default("Maharashtra"),
  pincode: text("pincode"),
  phone: text("phone"),
  mobile: text("mobile"),
  email: text("email"),
  website: text("website"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  upiId: text("upi_id"),
  logoUrl: text("logo_url"),
  qrCodeUrl: text("qr_code_url"),
  signatureUrl: text("signature_url"),
  invoicePrefix: text("invoice_prefix").default("INV"),
  quotationPrefix: text("quotation_prefix").default("QUO"),
  calculationPrefix: text("calculation_prefix").default("CAL"),
  financialYearStart: text("financial_year_start").default("04"), // April
  currentFinancialYear: text("current_financial_year"),
  invoiceCounter: integer("invoice_counter").default(1),
  defaultInvoiceType: text("default_invoice_type").default("normal"), // 'normal' | 'tax'
  gstEnabled: boolean("gst_enabled").default(false),
  defaultCgstPercent: real("default_cgst_percent").default(9),
  defaultSgstPercent: real("default_sgst_percent").default(9),
  defaultIgstPercent: real("default_igst_percent").default(18),
  defaultDiscountPercent: real("default_discount_percent").default(0),
  defaultTerms: text("default_terms"),
  invoiceNotes: text("invoice_notes"),
  invoiceFooter: text("invoice_footer").default("Thank you for your business!"),
  currency: text("currency").default("INR"),
  dateFormat: text("date_format").default("DD/MM/YYYY"),
  printSize: text("print_size").default("A5"),
  autoBackup: boolean("auto_backup").default(false),
  backupFrequency: text("backup_frequency").default("daily"),
  enableReminders: boolean("enable_reminders").default(true),
  reminderDays: integer("reminder_days").default(7),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
});

// ============================================
// RATE MASTER
// ============================================

export const rateMaster = pgTable("rate_master", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  itemName: text("item_name").notNull(),
  itemCode: text("item_code"),
  hsnCode: text("hsn_code"),
  defaultRate: real("default_rate").notNull().default(0),
  unit: text("unit").notNull(),
  gstPercent: real("gst_percent").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
}, (table) => ({
  categoryIdx: index("rate_category_idx").on(table.category),
}));

// ============================================
// CUSTOMERS (Enhanced)
// ============================================

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  customerCode: text("customer_code"),
  name: text("name").notNull(),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state").default("Maharashtra"),
  pincode: text("pincode"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  creditLimit: real("credit_limit").default(0),
  creditDays: integer("credit_days").default(30),
  openingBalance: real("opening_balance").default(0),
  totalBusiness: real("total_business").default(0),
  totalPaid: real("total_paid").default(0),
  balance: real("balance").default(0),
  autoReminder: boolean("auto_reminder").default(true),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
}, (table) => ({
  nameIdx: index("customer_name_idx").on(table.name),
  phoneIdx: index("customer_phone_idx").on(table.phone),
  balanceIdx: index("customer_balance_idx").on(table.balance),
}));

// ============================================
// INVOICES/ESTIMATES (Enhanced)
// ============================================

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  type: text("type").notNull().default("invoice"), // 'invoice' | 'quotation' | 'calculation'
  invoiceType: text("invoice_type").default("normal"), // 'normal' | 'tax'
  financialYear: text("financial_year"),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerGst: text("customer_gst"),
  customerState: text("customer_state"),
  invoiceDate: date("invoice_date").defaultNow(),
  dueDate: date("due_date"),
  subtotal: real("subtotal").notNull().default(0),
  discountPercent: real("discount_percent").default(0),
  discountAmount: real("discount_amount").default(0),
  taxableAmount: real("taxable_amount").default(0),
  cgstPercent: real("cgst_percent").default(0),
  cgstAmount: real("cgst_amount").default(0),
  sgstPercent: real("sgst_percent").default(0),
  sgstAmount: real("sgst_amount").default(0),
  igstPercent: real("igst_percent").default(0),
  igstAmount: real("igst_amount").default(0),
  gstPercent: real("gst_percent").default(0),
  gstAmount: real("gst_amount").default(0),
  roundOff: real("round_off").default(0),
  grandTotal: real("grand_total").notNull().default(0),
  amountInWords: text("amount_in_words"),
  paidAmount: real("paid_amount").default(0),
  balanceAmount: real("balance_amount").default(0),
  paymentStatus: text("payment_status").default("unpaid"),
  notes: text("notes"),
  termsConditions: text("terms_conditions"),
  status: text("status").notNull().default("draft"),
  convertedFrom: integer("converted_from"),
  convertedTo: integer("converted_to"),
  isPrinted: boolean("is_printed").default(false),
  printCount: integer("print_count").default(0),
  lastPrintedAt: timestamp("last_printed_at"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
}, (table) => ({
  invoiceNumIdx: index("estimate_invoice_num_idx").on(table.invoiceNumber),
  customerIdx: index("estimate_customer_idx").on(table.customerId),
  dateIdx: index("estimate_date_idx").on(table.invoiceDate),
  statusIdx: index("estimate_status_idx").on(table.paymentStatus),
}));

// ============================================
// ESTIMATE LINE ITEMS
// ============================================

export const estimateItems = pgTable("estimate_items", {
  id: serial("id").primaryKey(),
  estimateId: integer("estimate_id")
    .notNull()
    .references(() => estimates.id, { onDelete: "cascade" }),
  srNo: integer("sr_no").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  hsnCode: text("hsn_code"),
  width: real("width"),
  wSupport: real("w_support"),
  height: real("height"),
  hSupport: real("h_support"),
  size: text("size"),
  quantity: real("quantity").default(1),
  totalFit: real("total_fit").default(0),
  unit: text("unit"),
  rate: real("rate").default(0),
  amount: real("amount").default(0),
  gstPercent: real("gst_percent").default(0),
  gstAmount: real("gst_amount").default(0),
}, (table) => ({
  estimateIdx: index("item_estimate_idx").on(table.estimateId),
}));

// ============================================
// PAYMENTS
// ============================================

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  paymentNumber: text("payment_number"),
  estimateId: integer("estimate_id").references(() => estimates.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customers.id),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method").default("cash"),
  referenceNumber: text("reference_number"),
  bankName: text("bank_name"),
  chequeNumber: text("cheque_number"),
  chequeDate: date("cheque_date"),
  notes: text("notes"),
  paymentDate: date("payment_date").defaultNow(),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
}, (table) => ({
  estimateIdx: index("payment_estimate_idx").on(table.estimateId),
  customerIdx: index("payment_customer_idx").on(table.customerId),
  dateIdx: index("payment_date_idx").on(table.paymentDate),
}));

// ============================================
// EXPENSES
// ============================================

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  expenseNumber: text("expense_number"),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  categoryName: text("category_name"),
  vendorName: text("vendor_name"),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method").default("cash"),
  referenceNumber: text("reference_number"),
  billNumber: text("bill_number"),
  expenseDate: date("expense_date").defaultNow(),
  notes: text("notes"),
  attachmentUrl: text("attachment_url"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
}, (table) => ({
  dateIdx: index("expense_date_idx").on(table.expenseDate),
  categoryIdx: index("expense_category_idx").on(table.categoryId),
}));

// ============================================
// PURCHASES
// ============================================

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  balance: real("balance").default(0),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  purchaseNumber: text("purchase_number"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  vendorName: text("vendor_name"),
  billNumber: text("bill_number"),
  billDate: date("bill_date"),
  description: text("description").notNull(),
  quantity: real("quantity").default(1),
  rate: real("rate").default(0),
  amount: real("amount").notNull(),
  gstAmount: real("gst_amount").default(0),
  totalAmount: real("total_amount").notNull(),
  paymentMethod: text("payment_method").default("cash"),
  paidAmount: real("paid_amount").default(0),
  balanceAmount: real("balance_amount").default(0),
  paymentStatus: text("payment_status").default("unpaid"),
  purchaseDate: date("purchase_date").defaultNow(),
  notes: text("notes"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
}, (table) => ({
  dateIdx: index("purchase_date_idx").on(table.purchaseDate),
  vendorIdx: index("purchase_vendor_idx").on(table.vendorId),
}));

// ============================================
// CASH BOOK
// ============================================

export const cashBook = pgTable("cash_book", {
  id: serial("id").primaryKey(),
  entryDate: date("entry_date").defaultNow().notNull(),
  entryType: text("entry_type").notNull(), // 'receipt' | 'payment' | 'opening'
  referenceType: text("reference_type"), // 'invoice' | 'payment' | 'expense' | 'purchase' | 'manual'
  referenceId: integer("reference_id"),
  referenceNumber: text("reference_number"),
  particulars: text("particulars").notNull(),
  debit: real("debit").default(0), // money in
  credit: real("credit").default(0), // money out
  balance: real("balance").default(0), // running balance
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
}, (table) => ({
  dateIdx: index("cashbook_date_idx").on(table.entryDate),
  typeIdx: index("cashbook_type_idx").on(table.entryType),
}));

// ============================================
// LEDGER
// ============================================

export const ledgerEntries = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  entryDate: date("entry_date").defaultNow().notNull(),
  accountType: text("account_type").notNull(), // 'customer' | 'vendor' | 'expense' | 'income'
  accountId: integer("account_id"),
  accountName: text("account_name").notNull(),
  referenceType: text("reference_type"), // 'invoice' | 'payment' | 'expense' | 'purchase'
  referenceId: integer("reference_id"),
  referenceNumber: text("reference_number"),
  particulars: text("particulars").notNull(),
  debit: real("debit").default(0),
  credit: real("credit").default(0),
  balance: real("balance").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
}, (table) => ({
  dateIdx: index("ledger_date_idx").on(table.entryDate),
  accountIdx: index("ledger_account_idx").on(table.accountType, table.accountId),
}));

// ============================================
// REMINDERS
// ============================================

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  reminderType: text("reminder_type").notNull(), // 'payment' | 'due' | 'credit_limit'
  customerId: integer("customer_id").references(() => customers.id),
  estimateId: integer("estimate_id").references(() => estimates.id),
  title: text("title").notNull(),
  message: text("message"),
  dueDate: date("due_date"),
  amount: real("amount"),
  status: text("status").default("pending"), // 'pending' | 'sent' | 'dismissed'
  sentAt: timestamp("sent_at"),
  sentVia: text("sent_via"), // 'whatsapp' | 'email' | 'sms'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// BACKUPS
// ============================================

export const backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  backupType: text("backup_type").notNull(), // 'auto' | 'manual'
  fileName: text("file_name").notNull(),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  status: text("status").default("completed"), // 'pending' | 'completed' | 'failed'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
});

// ============================================
// SETTINGS (Key-Value for misc)
// ============================================

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
});

// ============================================
// FILE UPLOADS
// ============================================

export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  filePath: text("file_path").notNull(),
  uploadType: text("upload_type"), // 'logo' | 'qr' | 'signature' | 'attachment'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
});