"use client";

import { useState, useEffect, useCallback } from "react";
import { PAYMENT_METHODS, formatCurrency, formatDate, PaymentMethod } from "@/lib/constants";
import { E } from "@/components/emojis";

interface Payment {
  id: number;
  estimateId: number;
  customerId: number | null;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  paymentDate: string | null;
  createdAt: string;
  invoiceNumber: string;
  customerName: string | null;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerName: string | null;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
}

interface PaymentsProps {
  showToast: (message: string, type?: string) => void;
}

export default function Payments({ showToast }: PaymentsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "cash" as PaymentMethod,
    referenceNumber: "",
    notes: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, invoicesRes] = await Promise.all([
        fetch("/api/payments"),
        fetch("/api/estimates?type=invoice"),
      ]);
      const paymentsData = await paymentsRes.json();
      const invoicesData = await invoicesRes.json();

      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setPendingInvoices(
        Array.isArray(invoicesData)
          ? invoicesData.filter((inv: Invoice) => inv.paymentStatus !== "paid")
          : []
      );
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPayment = async () => {
    if (!selectedInvoice || !formData.amount) {
      showToast("Please select invoice and enter amount", "error");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      showToast("Amount must be greater than 0", "error");
      return;
    }

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId: selectedInvoice.id,
          amount,
          paymentMethod: formData.paymentMethod,
          referenceNumber: formData.referenceNumber || null,
          notes: formData.notes || null,
          paymentDate: formData.paymentDate,
        }),
      });

      if (res.ok) {
        showToast("Payment recorded successfully!");
        setShowAddModal(false);
        setSelectedInvoice(null);
        setFormData({
          amount: "",
          paymentMethod: "cash",
          referenceNumber: "",
          notes: "",
          paymentDate: new Date().toISOString().split("T")[0],
        });
        fetchData();
      } else {
        showToast("Failed to record payment", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to record payment", "error");
    }
  };

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-pulse"><E.Money/></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
          <div className="text-3xl mb-1"><E.Money/></div>
          <div className="text-2xl font-bold">{formatCurrency(totalReceived)}</div>
          <div className="text-sm text-white/80">Total Received</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <div className="text-3xl mb-1"><E.Hourglass/></div>
          <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
          <div className="text-sm text-white/80">Total Pending</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <div className="text-3xl mb-1"><E.Doc/></div>
          <div className="text-2xl font-bold">{pendingInvoices.length}</div>
          <div className="text-sm text-white/80">Pending Invoices</div>
        </div>
      </div>

      {/* Add Payment Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800"><E.Card/> Payment History</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 transition-all"
        >
          + Add Payment
        </button>
      </div>

      {/* Pending Invoices */}
      {pendingInvoices.length > 0 && (
        <div className="bg-orange-50 rounded-2xl border border-orange-200 p-5">
          <h3 className="font-bold text-orange-800 mb-3"><E.Hourglass/> Pending Payments</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingInvoices.slice(0, 6).map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-xl p-3 border border-orange-100 flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-sm text-gray-800">{inv.customerName || "Walk-in"}</div>
                  <div className="text-xs text-gray-500">{inv.invoiceNumber}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-orange-600">{formatCurrency(inv.balanceAmount)}</div>
                  <button
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setFormData({ ...formData, amount: inv.balanceAmount.toString() });
                      setShowAddModal(true);
                    }}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Collect →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3"><E.RupeeCircle/></div>
            <p className="text-gray-400">No payments recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {payment.paymentDate ? formatDate(payment.paymentDate) : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-700">{payment.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{payment.customerName || "Walk-in"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs capitalize">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{payment.referenceNumber || "-"}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg"><E.Money/> Record Payment</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                <E.X/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Invoice Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Select Invoice</label>
                <select
                  value={selectedInvoice?.id || ""}
                  onChange={(e) => {
                    const inv = pendingInvoices.find((i) => i.id === parseInt(e.target.value));
                    setSelectedInvoice(inv || null);
                    if (inv) setFormData({ ...formData, amount: inv.balanceAmount.toString() });
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- Select Invoice --</option>
                  {pendingInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.customerName || "Walk-in"} (Due: {formatCurrency(inv.balanceAmount)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedInvoice && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Amount:</span>
                    <span className="font-semibold">{formatCurrency(selectedInvoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paid:</span>
                    <span className="text-green-600">{formatCurrency(selectedInvoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-orange-600">Balance:</span>
                    <span className="text-orange-600">{formatCurrency(selectedInvoice.balanceAmount)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Date</label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: method.value })}
                      className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                        formData.paymentMethod === method.value
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Reference # (Optional)</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="UPI ID, Cheque No, etc."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Notes (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700"
              >
                <E.Money/> Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}