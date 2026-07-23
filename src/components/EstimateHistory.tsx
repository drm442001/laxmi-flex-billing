"use client";

import { type ReactNode } from "react";
import { formatCurrency, formatDateTime, DocumentType } from "@/lib/constants";
import { E } from "@/components/emojis";

interface EstimateRecord {
  id: number;
  invoiceNumber: string;
  type: string;
  customerName: string | null;
  customerPhone: string | null;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

interface EstimateHistoryProps {
  estimates: EstimateRecord[];
  onLoad: (id: number) => void;
  onDelete: (id: number) => void;
  onConvert: (id: number) => void;
  loading: boolean;
  type: DocumentType;
}

export default function EstimateHistory({ estimates, onLoad, onDelete, onConvert, loading, type }: EstimateHistoryProps) {
  const typeLabel = type === "invoice" ? "Invoices" : type === "quotation" ? "Quotations" : "Calculations";
  const typeIcon: ReactNode = type === "invoice" ? <E.Doc/> : type === "quotation" ? <E.Clipboard/> : <E.Calc/>;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-3xl mb-3 animate-pulse"><E.Hourglass/></div>
          <p className="text-gray-400">Loading {typeLabel.toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  // Stats
  const totalAmount = estimates.reduce((sum, e) => sum + e.grandTotal, 0);
  const paidAmount = estimates.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  const pendingAmount = estimates.reduce((sum, e) => sum + (e.balanceAmount || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Stats */}
      {type === "invoice" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
            <div className="text-xl mb-1"><E.Doc/></div>
            <div className="text-xl font-bold">{estimates.length}</div>
            <div className="text-xs text-white/80">Total Invoices</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
            <div className="text-xl mb-1"><E.Check/></div>
            <div className="text-lg font-bold">{formatCurrency(paidAmount)}</div>
            <div className="text-xs text-white/80">Received</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
            <div className="text-xl mb-1"><E.Hourglass/></div>
            <div className="text-lg font-bold">{formatCurrency(pendingAmount)}</div>
            <div className="text-xs text-white/80">Pending</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {typeIcon} {typeLabel} History
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {estimates.length} {typeLabel.toLowerCase()} • Total: {formatCurrency(totalAmount)}
          </p>
        </div>

        {estimates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">{typeIcon}</div>
            <p className="text-gray-400 text-sm">No {typeLabel.toLowerCase()} yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {estimates.map((est) => (
              <div
                key={est.id}
                className="px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-brand-700">
                        {est.invoiceNumber}
                      </span>
                      {type === "invoice" && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            est.paymentStatus === "paid"
                              ? "bg-green-100 text-green-700"
                              : est.paymentStatus === "partial"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {est.paymentStatus}
                        </span>
                      )}
                      {type !== "invoice" && est.status === "converted" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                          Converted
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {est.customerName || "Walk-in Customer"}
                      {est.customerPhone ? ` • ${est.customerPhone}` : ""}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(est.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">
                        {formatCurrency(est.grandTotal)}
                      </div>
                      {type === "invoice" && est.balanceAmount > 0 && (
                        <div className="text-xs text-orange-600">
                          Due: {formatCurrency(est.balanceAmount)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onLoad(est.id)}
                        className="px-3 py-2 bg-brand-50 text-brand-600 rounded-lg text-xs font-medium hover:bg-brand-100 transition-all"
                      >
                        <E.Folder/> Open
                      </button>
                      {(type === "quotation" || type === "calculation") && est.status !== "converted" && (
                        <button
                          onClick={() => onConvert(est.id)}
                          className="px-3 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-all"
                          title="Convert to Invoice"
                        >
                          <E.Doc/> To Invoice
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Delete this item? It will be moved to trash.")) {
                            onDelete(est.id);
                          }
                        }}
                        className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-all"
                      >
                        <E.Trash/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}