CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"module" text NOT NULL,
	"record_id" integer,
	"old_value" text,
	"new_value" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" serial PRIMARY KEY NOT NULL,
	"backup_type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text,
	"file_size" integer,
	"status" text DEFAULT 'completed',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "cash_book" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_date" date DEFAULT now() NOT NULL,
	"entry_type" text NOT NULL,
	"reference_type" text,
	"reference_id" integer,
	"reference_number" text,
	"particulars" text NOT NULL,
	"debit" real DEFAULT 0,
	"credit" real DEFAULT 0,
	"balance" real DEFAULT 0,
	"payment_method" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text DEFAULT 'Laxmi Flex Printers' NOT NULL,
	"owner_name" text,
	"address" text,
	"city" text DEFAULT 'Wardha',
	"state" text DEFAULT 'Maharashtra',
	"pincode" text,
	"phone" text,
	"mobile" text,
	"email" text,
	"website" text,
	"gst_number" text,
	"pan_number" text,
	"bank_name" text,
	"bank_branch" text,
	"account_number" text,
	"ifsc_code" text,
	"upi_id" text,
	"logo_url" text,
	"qr_code_url" text,
	"signature_url" text,
	"invoice_prefix" text DEFAULT 'INV',
	"quotation_prefix" text DEFAULT 'QUO',
	"calculation_prefix" text DEFAULT 'CAL',
	"financial_year_start" text DEFAULT '04',
	"current_financial_year" text,
	"invoice_counter" integer DEFAULT 1,
	"default_invoice_type" text DEFAULT 'normal',
	"gst_enabled" boolean DEFAULT false,
	"default_cgst_percent" real DEFAULT 9,
	"default_sgst_percent" real DEFAULT 9,
	"default_igst_percent" real DEFAULT 18,
	"default_discount_percent" real DEFAULT 0,
	"default_terms" text,
	"invoice_notes" text,
	"invoice_footer" text DEFAULT 'Thank you for your business!',
	"currency" text DEFAULT 'INR',
	"date_format" text DEFAULT 'DD/MM/YYYY',
	"print_size" text DEFAULT 'A5',
	"auto_backup" boolean DEFAULT false,
	"backup_frequency" text DEFAULT 'daily',
	"enable_reminders" boolean DEFAULT true,
	"reminder_days" integer DEFAULT 7,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_code" text,
	"name" text NOT NULL,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"address" text,
	"city" text,
	"state" text DEFAULT 'Maharashtra',
	"pincode" text,
	"gst_number" text,
	"pan_number" text,
	"credit_limit" real DEFAULT 0,
	"credit_days" integer DEFAULT 30,
	"opening_balance" real DEFAULT 0,
	"total_business" real DEFAULT 0,
	"total_paid" real DEFAULT 0,
	"balance" real DEFAULT 0,
	"auto_reminder" boolean DEFAULT true,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"deleted_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "estimate_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"estimate_id" integer NOT NULL,
	"sr_no" integer NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"hsn_code" text,
	"width" real,
	"w_support" real,
	"height" real,
	"h_support" real,
	"size" text,
	"quantity" real DEFAULT 1,
	"total_fit" real DEFAULT 0,
	"unit" text,
	"rate" real DEFAULT 0,
	"amount" real DEFAULT 0,
	"gst_percent" real DEFAULT 0,
	"gst_amount" real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "estimates" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"type" text DEFAULT 'invoice' NOT NULL,
	"invoice_type" text DEFAULT 'normal',
	"financial_year" text,
	"customer_id" integer,
	"customer_name" text,
	"customer_phone" text,
	"customer_address" text,
	"customer_gst" text,
	"customer_state" text,
	"invoice_date" date DEFAULT now(),
	"due_date" date,
	"subtotal" real DEFAULT 0 NOT NULL,
	"discount_percent" real DEFAULT 0,
	"discount_amount" real DEFAULT 0,
	"taxable_amount" real DEFAULT 0,
	"cgst_percent" real DEFAULT 0,
	"cgst_amount" real DEFAULT 0,
	"sgst_percent" real DEFAULT 0,
	"sgst_amount" real DEFAULT 0,
	"igst_percent" real DEFAULT 0,
	"igst_amount" real DEFAULT 0,
	"gst_percent" real DEFAULT 0,
	"gst_amount" real DEFAULT 0,
	"round_off" real DEFAULT 0,
	"grand_total" real DEFAULT 0 NOT NULL,
	"amount_in_words" text,
	"paid_amount" real DEFAULT 0,
	"balance_amount" real DEFAULT 0,
	"payment_status" text DEFAULT 'unpaid',
	"notes" text,
	"terms_conditions" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"converted_from" integer,
	"converted_to" integer,
	"is_printed" boolean DEFAULT false,
	"print_count" integer DEFAULT 0,
	"last_printed_at" timestamp,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"deleted_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	CONSTRAINT "estimates_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_number" text,
	"category_id" integer,
	"category_name" text,
	"vendor_name" text,
	"description" text NOT NULL,
	"amount" real NOT NULL,
	"payment_method" text DEFAULT 'cash',
	"reference_number" text,
	"bill_number" text,
	"expense_date" date DEFAULT now(),
	"notes" text,
	"attachment_url" text,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"deleted_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_date" date DEFAULT now() NOT NULL,
	"account_type" text NOT NULL,
	"account_id" integer,
	"account_name" text NOT NULL,
	"reference_type" text,
	"reference_id" integer,
	"reference_number" text,
	"particulars" text NOT NULL,
	"debit" real DEFAULT 0,
	"credit" real DEFAULT 0,
	"balance" real DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_number" text,
	"estimate_id" integer,
	"customer_id" integer,
	"amount" real NOT NULL,
	"payment_method" text DEFAULT 'cash',
	"reference_number" text,
	"bank_name" text,
	"cheque_number" text,
	"cheque_date" date,
	"notes" text,
	"payment_date" date DEFAULT now(),
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"deleted_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_number" text,
	"vendor_id" integer,
	"vendor_name" text,
	"bill_number" text,
	"bill_date" date,
	"description" text NOT NULL,
	"quantity" real DEFAULT 1,
	"rate" real DEFAULT 0,
	"amount" real NOT NULL,
	"gst_amount" real DEFAULT 0,
	"total_amount" real NOT NULL,
	"payment_method" text DEFAULT 'cash',
	"paid_amount" real DEFAULT 0,
	"balance_amount" real DEFAULT 0,
	"payment_status" text DEFAULT 'unpaid',
	"purchase_date" date DEFAULT now(),
	"notes" text,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"deleted_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "rate_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"item_name" text NOT NULL,
	"item_code" text,
	"hsn_code" text,
	"default_rate" real DEFAULT 0 NOT NULL,
	"unit" text NOT NULL,
	"gst_percent" real DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"reminder_type" text NOT NULL,
	"customer_id" integer,
	"estimate_id" integer,
	"title" text NOT NULL,
	"message" text,
	"due_date" date,
	"amount" real,
	"status" text DEFAULT 'pending',
	"sent_at" timestamp,
	"sent_via" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text,
	"file_size" integer,
	"file_path" text NOT NULL,
	"upload_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"email" text,
	"phone" text,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"phone" text,
	"email" text,
	"address" text,
	"gst_number" text,
	"pan_number" text,
	"balance" real DEFAULT 0,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_estimate_id_estimates_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_estimate_id_estimates_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_estimate_id_estimates_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_user_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_module_idx" ON "activity_logs" USING btree ("module");--> statement-breakpoint
CREATE INDEX "cashbook_date_idx" ON "cash_book" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "cashbook_type_idx" ON "cash_book" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "customer_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customer_balance_idx" ON "customers" USING btree ("balance");--> statement-breakpoint
CREATE INDEX "item_estimate_idx" ON "estimate_items" USING btree ("estimate_id");--> statement-breakpoint
CREATE INDEX "estimate_invoice_num_idx" ON "estimates" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "estimate_customer_idx" ON "estimates" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "estimate_date_idx" ON "estimates" USING btree ("invoice_date");--> statement-breakpoint
CREATE INDEX "estimate_status_idx" ON "estimates" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "expense_date_idx" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "expense_category_idx" ON "expenses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "ledger_date_idx" ON "ledger_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "ledger_account_idx" ON "ledger_entries" USING btree ("account_type","account_id");--> statement-breakpoint
CREATE INDEX "payment_estimate_idx" ON "payments" USING btree ("estimate_id");--> statement-breakpoint
CREATE INDEX "payment_customer_idx" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payment_date_idx" ON "payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "purchase_date_idx" ON "purchases" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "purchase_vendor_idx" ON "purchases" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "rate_category_idx" ON "rate_master" USING btree ("category");