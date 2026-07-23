"use client";

import { useState, useEffect, type ReactNode } from "react";
import { formatCurrency } from "@/lib/constants";
import { E } from "@/components/emojis";

interface SummarySectionProps {
  invoiceType: string;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  gstPercent: number;
  gstAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  onDiscountChange: (val: number) => void; // rupees
  onGstPercentChange: (val: number) => void;
  onRoundOffChange: (val: number) => void;
  onAdvanceChange: (cash: number, account: number) => void;
  onAction: (action: "save" | "print" | "pdf" | "clear" | "new" | "preview") => void;
  canSave: boolean;
  isEditing: boolean;
}

export default function SummarySection({
  invoiceType, subtotal, taxableAmount,
  cgstAmount, sgstAmount, igstAmount, gstAmount, grandTotal, paidAmount,
  onDiscountChange, onGstPercentChange, onRoundOffChange, onAdvanceChange,
  onAction, canSave, isEditing,
}: SummarySectionProps) {
  const isTax = invoiceType === "tax";

  const [discount, setDiscount] = useState<number>(0);
  const [cashPay, setCashPay] = useState<number>(0);
  const [accountPay, setAccountPay] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(0);
  const [roundOff, setRoundOff] = useState<number>(0);

  // Sync when invoice type flips
  useEffect(() => {
    if (!isTax) { setGstRate(0); onGstPercentChange(0); }
  }, [isTax, onGstPercentChange]);

  useEffect(() => {
    setDiscount(0); setCashPay(0); setAccountPay(0); setRoundOff(0);
  }, [isEditing]);

  useEffect(() => { onDiscountChange(discount || 0); }, [discount, onDiscountChange]);
  useEffect(() => {
    onAdvanceChange(cashPay || 0, accountPay || 0);
  }, [cashPay, accountPay, onAdvanceChange]);

  const afterDiscount = Math.max(0, subtotal - (discount || 0));
  const taxTotal = isTax ? gstAmount : 0;
  const netTotal = Number((afterDiscount + taxTotal + (roundOff || 0)).toFixed(2));
  const totalAdvance = Number(((cashPay || 0) + (accountPay || 0)).toFixed(2));
  const outstanding = Math.max(0, Number((netTotal - totalAdvance).toFixed(2)));

  const num = (n: number | undefined) => `₹${(n || 0).toFixed(2)}`;
  const inputCls = "w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ml-auto";
  const labelCls = "text-sm text-gray-700 flex items-center gap-2 w-full";
  const rowCls = "flex items-center justify-between gap-3";

  const btn = (color: string, icon: ReactNode, label: string, action: "save"|"print"|"pdf"|"clear"|"new"|"preview", disabled = false) => (
    <button
      onClick={() => onAction(action)}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 ${color}`}
    >
      <span className="inline-flex">{icon}</span>{label}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><E.Cash/> Summary
          {isTax && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Tax Invoice</span>}
        </h3>
      </div>

      <div className="space-y-3 max-w-md ml-auto">
        {/* Subtotal */}
        <div className={rowCls}>
          <span className={labelCls}>Subtotal</span>
          <span className="font-semibold text-gray-800">{num(subtotal)}</span>
        </div>

        {/* Discount (Rupees) */}
        <div className={rowCls}>
          <label className={labelCls}>Discount (₹)</label>
          <input type="number" step="1" min="0" value={discount || ""} onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
            placeholder="0" className={inputCls} />
        </div>
        {discount > 0 && (
          <div className={rowCls + " text-red-500 text-sm pl-4"}>
            <span>− Discount</span>
            <span className="font-medium">− {num(discount)}</span>
          </div>
        )}

        {/* After Discount */}
        <div className={`${rowCls} pt-2 border-t border-gray-100`}>
          <span className={labelCls + " font-medium"}>After Discount</span>
          <span className="font-semibold text-gray-800">{num(afterDiscount)}</span>
        </div>

        {/* GST only for tax invoice */}
        {isTax && (
          <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 space-y-2">
            <div className={rowCls}>
              <label className={labelCls}>GST Rate (%)
                <select value={gstRate} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setGstRate(v); onGstPercentChange(v); }}
                  className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm">
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </label>
              <span className="text-green-600 font-medium">+ {num(gstAmount)}</span>
            </div>
            {gstAmount > 0 && igstAmount > 0 && (
              <div className="flex justify-between text-xs text-gray-600 pl-4">
                <span>IGST</span><span>{num(igstAmount)}</span>
              </div>
            )}
            {gstAmount > 0 && igstAmount === 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pl-4">
                <div className="flex justify-between"><span>CGST</span><span>{num(cgstAmount)}</span></div>
                <div className="flex justify-between"><span>SGST</span><span>{num(sgstAmount)}</span></div>
              </div>
            )}
          </div>
        )}

        {/* Round off — only tax invoice */}
        {isTax && (
          <div className={rowCls}>
            <label className={labelCls}>Round Off</label>
            <input type="number" step="0.01" value={roundOff || ""} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setRoundOff(v); onRoundOffChange(v); }}
              placeholder="0" className={inputCls} />
          </div>
        )}

        {/* Net Total / Grand Total before payment */}
        <div className="border-t-2 border-blue-600 pt-2">
          <div className={rowCls}>
            <span className="text-lg font-bold text-gray-800">Net Total</span>
            <span className="text-xl font-bold text-blue-700">{num(netTotal)}</span>
          </div>
        </div>

        {/* Received Amount (always visible: Cash + Bank + Total) */}
        <div className="bg-green-50 rounded-xl p-3 border border-green-100 space-y-2">
          <div className="text-sm font-semibold text-green-800"><E.Money/> Received Amount</div>
          <div className={rowCls}>
            <label className={labelCls}><E.Cash/> Cash Amount</label>
            <input type="number" step="1" min="0" value={cashPay || ""} onChange={(e) => setCashPay(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0" className={inputCls} />
          </div>
          <div className={rowCls}>
            <label className={labelCls}><E.Bank/> Bank Amount (Account)</label>
            <input type="number" step="1" min="0" value={accountPay || ""} onChange={(e) => setAccountPay(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0" className={inputCls} />
          </div>
          <div className={rowCls + " pt-1 border-t border-green-200"}>
            <span className="text-sm text-green-700 font-medium">Total Received</span>
            <span className="font-bold text-green-700">{num(totalAdvance)}</span>
          </div>
        </div>

        {/* Outstanding */}
        <div className={rowCls}>
          <span className="text-sm font-semibold text-orange-600">Outstanding Dues</span>
          <span className={`font-bold text-lg ${outstanding > 0 ? "text-orange-600" : "text-green-600"}`}>
            {num(outstanding)}
          </span>
        </div>

        {/* Grand Total */}
        <div className={`${rowCls} pt-2 border-t-2 border-dashed border-gray-300`}>
          <span className="text-lg font-bold text-gray-800">Grand Total</span>
          <span className="text-2xl font-bold text-blue-700">{num(netTotal)}</span>
        </div>
      </div>

      {/* Action Buttons moved here — below summary */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
        {btn("bg-white border border-gray-300 text-gray-700 hover:bg-gray-50", <E.Doc/>, "New", "new")}
        {btn("bg-blue-600 hover:bg-blue-700 text-white", <E.Save/>, isEditing ? "Update" : "Save", "save", !canSave)}
        {btn("bg-gray-500 hover:bg-gray-600 text-white", <E.Eye/>, "Preview", "preview", !canSave)}
        {btn("bg-green-600 hover:bg-green-700 text-white", <E.Printer/>, "Print A5", "print", !canSave)}
        {btn("bg-orange-500 hover:bg-orange-600 text-white", <E.Doc/>, "PDF", "pdf", !canSave)}
        {btn("bg-white border border-red-300 text-red-600 hover:bg-red-50", <E.Trash/>, "Clear", "clear")}
      </div>
    </div>
  );
}
