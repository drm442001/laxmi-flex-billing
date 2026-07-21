"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/constants";

interface DashboardData {
  todaySales: number;
  todayInvoices: number;
  monthlySales: number;
  monthlyInvoices: number;
  yearlySales: number;
  yearlyInvoices: number;
  totalOutstanding: number;
  pendingInvoicesCount: number;
  monthlyExpenses: number;
  monthlyPurchases: number;
  cashBalance: number;
  profit: number;
  growthPercent: number;
  totalCustomers: number;
  totalInvoices: number;
  totalQuotations: number;
  pendingInvoices: number;
  monthlyRevenue: { month: string; revenue: number }[];
  recentInvoices: Array<{
    id: number;
    invoiceNumber: string;
    customerName: string;
    grandTotal: number;
    paymentStatus: string;
    invoiceDate: string;
  }>;
  pendingPayments: Array<{
    id: number;
    invoiceNumber: string;
    customerName: string;
    balanceAmount: number;
    invoiceDate: string;
  }>;
  creditAlerts: Array<{
    id: number;
    name: string;
    phone: string;
    creditLimit: number;
    balance: number;
  }>;
  topCustomers: Array<{
    id: number;
    name: string;
    totalBusiness: number;
    balance: number;
  }>;
}

interface DashboardProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">📊</div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-400">Failed to load dashboard.</div>;
  }

  const maxRevenue = Math.max(...(data.monthlyRevenue?.map((m) => m.revenue) || [1]), 1);

  return (
    <div className="space-y-5">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon="📅" label="Today's Sales" value={formatCurrency(data.todaySales)} subtext={`${data.todayInvoices} invoices`} gradient="from-blue-500 to-blue-600" />
        <StatCard icon="📆" label="Monthly Sales" value={formatCurrency(data.monthlySales)} subtext={`${data.monthlyInvoices} invoices`} gradient="from-indigo-500 to-indigo-600" />
        <StatCard icon="⏳" label="Outstanding" value={formatCurrency(data.totalOutstanding)} subtext={`${data.pendingInvoicesCount} pending`} gradient="from-orange-500 to-orange-600" />
        <StatCard icon="💸" label="Expenses" value={formatCurrency(data.monthlyExpenses)} subtext="This month" gradient="from-red-500 to-red-600" />
        <StatCard icon="💰" label="Cash Balance" value={formatCurrency(data.cashBalance)} gradient="from-green-500 to-green-600" />
        <StatCard icon="📈" label="Profit" value={formatCurrency(data.profit)} subtext={`${data.growthPercent >= 0 ? "+" : ""}${data.growthPercent}%`} gradient={data.profit >= 0 ? "from-emerald-500 to-emerald-600" : "from-red-500 to-red-600"} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniCard icon="📄" label="Total Invoices" value={data.totalInvoices} onClick={() => onNavigate("history")} />
        <MiniCard icon="📋" label="Quotations" value={data.totalQuotations} onClick={() => onNavigate("history")} />
        <MiniCard icon="👥" label="Customers" value={data.totalCustomers} onClick={() => onNavigate("customers")} />
        <MiniCard icon="⏱️" label="Pending" value={data.pendingInvoices} color="text-orange-600" onClick={() => onNavigate("payments")} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">📊 Monthly Revenue</h3>
          <div className="h-48 flex items-end gap-2">
            {data.monthlyRevenue.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            ) : (
              data.monthlyRevenue.map((month, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] text-gray-500 font-medium">{formatCurrency(month.revenue).replace("₹", "")}</div>
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-700 hover:to-blue-500"
                    style={{ height: `${Math.max((month.revenue / maxRevenue) * 140, 8)}px` }}
                  />
                  <div className="text-xs text-gray-400">{month.month}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Credit Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-red-50">
            <h3 className="font-bold text-red-700">⚠️ Credit Alerts</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-60 overflow-auto">
            {data.creditAlerts.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No alerts 👍</div>
            ) : (
              data.creditAlerts.map((cust) => (
                <div key={cust.id} className="px-4 py-3 hover:bg-red-50/50">
                  <div className="font-medium text-sm text-gray-800">{cust.name}</div>
                  <div className="text-xs text-gray-400">{cust.phone}</div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-gray-500">Limit: {formatCurrency(cust.creditLimit)}</span>
                    <span className="text-red-600 font-semibold">Due: {formatCurrency(cust.balance)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">📄 Recent Invoices</h3>
            <button onClick={() => onNavigate("history")} className="text-xs text-blue-600 hover:underline">View All →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentInvoices.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No invoices yet</div>
            ) : (
              data.recentInvoices.map((inv) => (
                <div key={inv.id} className="px-5 py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer" onClick={() => onNavigate("loadInvoice", { id: inv.id })}>
                  <div>
                    <div className="font-semibold text-sm text-blue-700">{inv.invoiceNumber}</div>
                    <div className="text-xs text-gray-400">{inv.customerName || "Walk-in"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{formatCurrency(inv.grandTotal)}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${inv.paymentStatus === "paid" ? "bg-green-100 text-green-700" : inv.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                      {inv.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">⏳ Pending Payments</h3>
            <button onClick={() => onNavigate("payments")} className="text-xs text-blue-600 hover:underline">View All →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {data.pendingPayments.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">All payments received! 🎉</div>
            ) : (
              data.pendingPayments.map((inv) => (
                <div key={inv.id} className="px-5 py-3 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{inv.invoiceNumber}</div>
                    <div className="text-xs text-gray-400">{inv.customerName || "Walk-in"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-orange-600">{formatCurrency(inv.balanceAmount)}</div>
                    <div className="text-[10px] text-gray-400">{formatDate(inv.invoiceDate)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Customers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">👑 Top Customers</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topCustomers.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No customers yet</div>
            ) : (
              data.topCustomers.map((cust, i) => (
                <div key={cust.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👤"}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{cust.name}</div>
                    <div className="text-xs text-gray-400">Business: {formatCurrency(cust.totalBusiness || 0)}</div>
                  </div>
                  {(cust.balance || 0) > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">Due: {formatCurrency(cust.balance)}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">⚡ Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            <QuickAction icon="📄" label="Invoice" onClick={() => onNavigate("invoice")} color="blue" />
            <QuickAction icon="📋" label="Quotation" onClick={() => onNavigate("quotation")} color="purple" />
            <QuickAction icon="🧮" label="Calculate" onClick={() => onNavigate("calculate")} color="green" />
            <QuickAction icon="💰" label="Payment" onClick={() => onNavigate("payments")} color="emerald" />
            <QuickAction icon="💸" label="Expense" onClick={() => onNavigate("expenses")} color="red" />
            <QuickAction icon="📊" label="Reports" onClick={() => onNavigate("reports")} color="indigo" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, gradient }: { icon: string; label: string; value: string; subtext?: string; gradient: string }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 text-white shadow-sm`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-lg sm:text-xl font-bold truncate">{value}</div>
      <div className="text-[11px] text-white/80">{label}</div>
      {subtext && <div className="text-[10px] text-white/60 mt-0.5">{subtext}</div>}
    </div>
  );
}

function MiniCard({ icon, label, value, color, onClick }: { icon: string; label: string; value: number; color?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-all">
      <span className="text-xl">{icon}</span>
      <div>
        <div className={`text-lg font-bold ${color || "text-gray-800"}`}>{value}</div>
        <div className="text-[10px] text-gray-400 uppercase">{label}</div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick, color }: { icon: string; label: string; onClick: () => void; color: string }) {
  const bgClasses: Record<string, string> = {
    blue: "bg-blue-50 hover:bg-blue-100 text-blue-700",
    purple: "bg-purple-50 hover:bg-purple-100 text-purple-700",
    green: "bg-green-50 hover:bg-green-100 text-green-700",
    emerald: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700",
    red: "bg-red-50 hover:bg-red-100 text-red-700",
    indigo: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700",
  };
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${bgClasses[color]}`}>
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}