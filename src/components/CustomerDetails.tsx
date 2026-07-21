"use client";

import { INVOICE_TYPES } from "@/lib/constants";

interface CustomerDetailsProps {
  invoiceNumber: string;
  invoiceType: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGst: string;
  notes: string;
  onInvoiceNumberChange: (val: string) => void;
  onInvoiceTypeChange: (val: string) => void;
  onInvoiceDateChange: (val: string) => void;
  onCustomerNameChange: (val: string) => void;
  onCustomerPhoneChange: (val: string) => void;
  onCustomerAddressChange: (val: string) => void;
  onCustomerGstChange: (val: string) => void;
  onNotesChange: (val: string) => void;
}

export default function CustomerDetails({
  invoiceNumber,
  invoiceType,
  invoiceDate,
  customerName,
  customerPhone,
  customerAddress,
  customerGst,
  notes,
  onInvoiceNumberChange,
  onInvoiceTypeChange,
  onInvoiceDateChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerAddressChange,
  onCustomerGstChange,
  onNotesChange,
}: CustomerDetailsProps) {
  const inputClass =
    "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        👤 Customer & Invoice Details
      </h3>

      {/* Row 1: Invoice Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <label className={labelClass}>Invoice #</label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => onInvoiceNumberChange(e.target.value)}
            className={`${inputClass} font-mono bg-gray-50`}
            readOnly
          />
        </div>
        <div>
          <label className={labelClass}>Invoice Type</label>
          <select
            value={invoiceType}
            onChange={(e) => onInvoiceTypeChange(e.target.value)}
            className={inputClass}
          >
            {INVOICE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Invoice Date</label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => onInvoiceDateChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Customer GSTIN</label>
          <input
            type="text"
            value={customerGst}
            onChange={(e) => onCustomerGstChange(e.target.value.toUpperCase())}
            placeholder="GSTIN (for Tax Invoice)"
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 2: Customer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className={labelClass}>Customer Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Enter customer name"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            placeholder="Enter phone number"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <input
            type="text"
            value={customerAddress}
            onChange={(e) => onCustomerAddressChange(e.target.value)}
            placeholder="Enter address"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any additional notes..."
          className={`${inputClass} h-16 resize-none`}
        />
      </div>
    </div>
  );
}