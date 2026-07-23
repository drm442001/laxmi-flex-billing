"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { INVOICE_TYPES } from "@/lib/constants";
import { E } from "@/components/emojis";

interface CustomerSuggestion {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  gstNumber: string | null;
}

interface CustomerDetailsProps {
  invoiceNumber: string;
  invoiceType: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGst: string;
  notes: string;
  onInvoiceTypeChange: (val: string) => void;
  onInvoiceDateChange: (val: string) => void;
  onCustomerNameChange: (val: string) => void;
  onCustomerPhoneChange: (val: string) => void;
  onCustomerAddressChange: (val: string) => void;
  onCustomerGstChange: (val: string) => void;
  onNotesChange: (val: string) => void;
  onCustomerSelect?: (cust: CustomerSuggestion) => void;
  invoiceTypeRef?: React.RefObject<HTMLSelectElement | null>;
  customerNameRef?: React.RefObject<HTMLInputElement | null>;
}

export default function CustomerDetails({
  invoiceNumber, invoiceType, invoiceDate,
  customerName, customerPhone, customerAddress, customerGst, notes,
  onInvoiceTypeChange, onInvoiceDateChange,
  onCustomerNameChange, onCustomerPhoneChange, onCustomerAddressChange,
  onCustomerGstChange, onNotesChange, onCustomerSelect,
  invoiceTypeRef, customerNameRef,
}: CustomerDetailsProps) {
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const suggestionRef = useRef<HTMLDivElement | null>(null);

  const isTax = invoiceType === "tax";

  // Debounced customer search (1 char is enough; matches from DB / old invoices)
  useEffect(() => {
    if (!customerName || customerName.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(customerName.trim())}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const q = customerName.toLowerCase().trim();
          const filtered = data
            .filter((c: any) => {
              const nm = (c.name || "").toLowerCase();
              const ph = String(c.phone || "");
              return nm.includes(q) || ph.includes(customerName.trim());
            })
            .slice(0, 8)
            .map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, address: c.address, gstNumber: c.gstNumber }));
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
          setHighlightIndex(-1);
        }
      } catch {
        /* ignore */
      }
    }, 150);
    return () => clearTimeout(t);
  }, [customerName]);

  const pickSuggestion = (c: CustomerSuggestion) => {
    onCustomerNameChange(c.name);
    if (c.phone) onCustomerPhoneChange(c.phone);
    if (c.address) onCustomerAddressChange(c.address);
    if (c.gstNumber && isTax) onCustomerGstChange(c.gstNumber);
    setShowSuggestions(false);
    setSuggestions([]);
    onCustomerSelect?.(c);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        e.preventDefault();
        pickSuggestion(suggestions[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    } else if (e.key === "Tab" && highlightIndex >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[highlightIndex]);
    }
  };

  useEffect(() => {
    if (!showSuggestions) return;
    const close = () => setShowSuggestions(false);
    setTimeout(() => document.addEventListener("click", close, { once: true }), 0);
    return () => document.removeEventListener("click", close);
  }, [showSuggestions]);

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <E.User/> Customer &amp; Invoice Details
      </h3>

      {/* Row 1: Invoice Info */}
      <div className={`grid gap-4 mb-4 ${isTax ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
        <div>
          <label className={labelClass}>Invoice #</label>
          <div className={`${inputClass} font-mono bg-blue-50 text-blue-800 font-semibold flex items-center cursor-default`}>
            {invoiceNumber}
          </div>
        </div>
        <div>
          <label className={labelClass}>Invoice Type</label>
          <select
            ref={invoiceTypeRef as any}
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
        {isTax && (
          <div>
            <label className={labelClass}>Customer GSTIN</label>
            <input
              type="text"
              value={customerGst}
              onChange={(e) => onCustomerGstChange(e.target.value.toUpperCase())}
              placeholder="22AAAAA0000A1Z5"
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* Row 2: Customer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="relative">
          <label className={labelClass}>Customer Name</label>
          <input
            ref={customerNameRef as any}
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            onFocus={() => {
              // Show suggestions when focusing if there's any text (or at least 1 char)
              if (customerName && customerName.trim().length >= 1) {
                // Trigger a re-search just in case
              }
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={handleNameKeyDown}
            placeholder="ग्राहकाचे नाव टाइप करा / Type to search"
            className={inputClass}
            autoComplete="off"
            autoFocus
          />
          {showSuggestions && (
            <div
              ref={suggestionRef}
              className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto"
            >
              {suggestions.map((c, i) => (
                <div
                  key={c.id}
                  onMouseDown={(e) => { e.preventDefault(); pickSuggestion(c); }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`px-3 py-2 cursor-pointer text-sm ${
                    i === highlightIndex ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-400">
                    {c.phone || ""}{c.phone && c.address ? " • " : ""}{c.address || ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            placeholder="Phone number"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <input
            type="text"
            value={customerAddress}
            onChange={(e) => onCustomerAddressChange(e.target.value)}
            placeholder="Address"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any additional notes…"
          className={`${inputClass} h-16 resize-none`}
        />
      </div>
    </div>
  );
}
