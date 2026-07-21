"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/constants";

interface StatementEntry {
  date: string;
  type: "invoice" | "payment";
  description: string;
  debit: number;
  credit: number;
  reference: string;
  balance: number;
}

interface StatementData {
  customer: {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
    email: string | null;
  };
  entries: StatementEntry[];
  summary: {
    totalInvoices: number;
    totalDebit: number;
    totalCredit: number;
    balance: number;
  };
}

interface StatementProps {
  customerId: number;
  onBack: () => void;
}

export default function Statement({ customerId, onBack }: StatementProps) {
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatement = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/statement`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-pulse">📊</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-400">
        Failed to load statement data.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center no-print">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          ← Back to Customers
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700"
        >
          🖨️ Print Statement
        </button>
      </div>

      {/* Statement Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Statement Header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-900 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Account Statement</h2>
              <p className="text-brand-200 text-sm mt-1">Laxmi Flex Printers, Wardha</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-brand-200">Statement Date</p>
              <p className="font-semibold">{new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase">Customer</p>
              <p className="font-bold text-lg text-gray-800">{data.customer.name}</p>
              {data.customer.phone && <p className="text-sm text-gray-500">📱 {data.customer.phone}</p>}
              {data.customer.email && <p className="text-sm text-gray-500">✉️ {data.customer.email}</p>}
              {data.customer.address && <p className="text-sm text-gray-500">📍 {data.customer.address}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-gray-400 uppercase">Current Balance</p>
              <p className={`font-bold text-2xl ${data.summary.balance > 0 ? "text-orange-600" : "text-green-600"}`}>
                {formatCurrency(data.summary.balance)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {data.summary.balance > 0 ? "Amount Due" : "No Balance"}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          <div className="p-4 text-center">
            <p className="text-xs text-gray-400 uppercase">Total Invoices</p>
            <p className="font-bold text-xl text-gray-800">{data.summary.totalInvoices}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-gray-400 uppercase">Total Billed</p>
            <p className="font-bold text-xl text-gray-800">{formatCurrency(data.summary.totalDebit)}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-gray-400 uppercase">Total Paid</p>
            <p className="font-bold text-xl text-green-600">{formatCurrency(data.summary.totalCredit)}</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-right">Debit (₹)</th>
                <th className="px-4 py-3 text-right">Credit (₹)</th>
                <th className="px-4 py-3 text-right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No transactions found
                  </td>
                </tr>
              ) : (
                data.entries.map((entry, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={entry.type === "invoice" ? "text-blue-500" : "text-green-500"}>
                          {entry.type === "invoice" ? "📄" : "💰"}
                        </span>
                        {entry.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{entry.reference}</td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(entry.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                <td className="px-4 py-3 text-right text-red-600">{formatCurrency(data.summary.totalDebit)}</td>
                <td className="px-4 py-3 text-right text-green-600">{formatCurrency(data.summary.totalCredit)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(data.summary.balance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 text-center text-xs text-gray-400">
          <p>This is a computer-generated statement. For any queries, contact Laxmi Flex Printers, Wardha.</p>
        </div>
      </div>
    </div>
  );
}