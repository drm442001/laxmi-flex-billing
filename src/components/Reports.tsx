"use client";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { formatCurrency } from "@/lib/constants";
import { E } from "@/components/emojis";

interface ReportData {
  period: { from:string; to:string; type:string };
  sales: { totalInvoices:number; totalSales:number; totalPaid:number; totalPending:number; totalQuotations:number; quotationValue:number };
  payments: { totalPayments:number; totalAmount:number; cashAmount:number; upiAmount:number; bankAmount:number; chequeAmount:number };
  expenses: { totalExpenses:number; totalAmount:number };
  purchases: { totalPurchases:number; totalAmount:number; totalPaid:number; totalPending:number };
  profit: number;
  topCustomers: { id:number; name:string; totalBusiness:number; balance:number }[];
  topItems: { description:string; count:number; totalQty:number; revenue:number }[];
  pendingPayments: { id:number; invoiceNumber:string; customerName:string; grandTotal:number; paidAmount:number; balanceAmount:number; invoiceDate:string }[];
}

interface ReportsProps { showToast:(m:string,t?:string)=>void }

export default function Reports({ showToast }:ReportsProps) {
  const [reportType, setReportType] = useState("daily");
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<ReportData|null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${reportType}&from=${fromDate}&to=${toDate}`);
      const d = await res.json();
      if (!d.error) setData(d);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  }, [reportType, fromDate, toDate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const handleTypeChange = (t:string) => {
    setReportType(t);
    const now = new Date();
    if (t === "daily") { const d = now.toISOString().split("T")[0]; setFromDate(d); setToDate(d); }
    if (t === "monthly") { setFromDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]); setToDate(now.toISOString().split("T")[0]); }
    if (t === "yearly") { setFromDate(new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0]); setToDate(now.toISOString().split("T")[0]); }
  };

  const handlePrint = () => { window.print(); };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 no-print">
        <h2 className="text-xl font-bold text-gray-800"><E.Chart/> Reports</h2>
        <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700"><E.Printer/> Print Report</button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 no-print">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex gap-1">
            {["daily","monthly","yearly"].map(t=>(
              <button key={t} onClick={()=>handleTypeChange(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${reportType===t?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{t}</button>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <div><label className="block text-xs text-gray-500 mb-1">From</label><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">To</label><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
            <button onClick={loadReport} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">Generate</button>
          </div>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-4xl animate-pulse"><E.Chart/></div> : !data ? <div className="text-center py-12 text-gray-400">No report data</div> : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <SC icon={<E.Doc/>} label="Invoices" value={data.sales.totalInvoices.toString()} sub={formatCurrency(data.sales.totalSales)} color="from-blue-500 to-blue-600"/>
            <SC icon={<E.Check/>} label="Received" value={formatCurrency(data.payments.totalAmount)} sub={`${data.payments.totalPayments} payments`} color="from-green-500 to-green-600"/>
            <SC icon={<E.Hourglass/>} label="Pending" value={formatCurrency(data.sales.totalPending)} color="from-orange-500 to-orange-600"/>
            <SC icon={<E.RupeeCircle/>} label="Expenses" value={formatCurrency(data.expenses.totalAmount)} sub={`${data.expenses.totalExpenses} entries`} color="from-red-500 to-red-600"/>
            <SC icon={<E.TrendUp/>} label="Profit" value={formatCurrency(data.profit)} color={data.profit >= 0 ? "from-emerald-500 to-emerald-600" : "from-red-500 to-red-600"}/>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Sales Report */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3"><E.Doc/> Sales Report</h3>
              <div className="space-y-2 text-sm">
                <Row label="Total Invoices" value={data.sales.totalInvoices.toString()}/>
                <Row label="Total Sales" value={formatCurrency(data.sales.totalSales)}/>
                <Row label="Amount Received" value={formatCurrency(data.sales.totalPaid)} cls="text-green-600"/>
                <Row label="Amount Pending" value={formatCurrency(data.sales.totalPending)} cls="text-orange-600"/>
                <div className="border-t border-gray-100 pt-2"><Row label="Quotations" value={`${data.sales.totalQuotations} (${formatCurrency(data.sales.quotationValue)})`}/></div>
              </div>
            </div>
            {/* Payment Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3"><E.Card/> Payment Breakdown</h3>
              <div className="space-y-2 text-sm">
                <Row label={<><E.Cash/> Cash</>} value={formatCurrency(data.payments.cashAmount)}/>
                <Row label={<><E.Mobile/> UPI</>} value={formatCurrency(data.payments.upiAmount)}/>
                <Row label={<><E.Bank/> Bank</>} value={formatCurrency(data.payments.bankAmount)}/>
                <Row label={<><E.Note/> Cheque</>} value={formatCurrency(data.payments.chequeAmount)}/>
                <div className="border-t border-gray-100 pt-2 font-bold"><Row label="Total" value={formatCurrency(data.payments.totalAmount)}/></div>
              </div>
            </div>
            {/* Purchase Report */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3"><E.Cart/> Purchase Report</h3>
              <div className="space-y-2 text-sm">
                <Row label="Total Purchases" value={data.purchases.totalPurchases.toString()}/>
                <Row label="Total Amount" value={formatCurrency(data.purchases.totalAmount)}/>
                <Row label="Paid" value={formatCurrency(data.purchases.totalPaid)} cls="text-green-600"/>
                <Row label="Pending" value={formatCurrency(data.purchases.totalPending)} cls="text-orange-600"/>
              </div>
            </div>
            {/* Expense Report */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3"><E.RupeeCircle/> Expense Report</h3>
              <div className="space-y-2 text-sm">
                <Row label="Total Entries" value={data.expenses.totalExpenses.toString()}/>
                <Row label="Total Amount" value={formatCurrency(data.expenses.totalAmount)} cls="text-red-600"/>
              </div>
            </div>
            {/* Profit Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3"><E.TrendUp/> Profit Summary</h3>
              <div className="space-y-2 text-sm">
                <Row label="Revenue Received" value={formatCurrency(data.payments.totalAmount)} cls="text-green-600"/>
                <Row label="(-) Expenses" value={formatCurrency(data.expenses.totalAmount)} cls="text-red-600"/>
                <Row label="(-) Purchases" value={formatCurrency(data.purchases.totalPaid)} cls="text-red-600"/>
                <div className="border-t-2 border-gray-200 pt-2"><Row label="Net Profit" value={formatCurrency(data.profit)} cls={data.profit >= 0 ? "text-green-700 text-lg font-bold" : "text-red-600 text-lg font-bold"}/></div>
              </div>
            </div>
            {/* Top Customers */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3"><E.Crown/> Top Customers</h3>
              {data.topCustomers.length === 0 ? <p className="text-gray-400 text-sm">No data</p> : (
                <div className="space-y-2">{data.topCustomers.map((c,i)=>(
                  <div key={c.id} className="flex justify-between items-center text-sm gap-2">
                    <span className="text-gray-700 inline-flex items-center gap-1.5">{i===0?<E.Medal1/>:i===1?<E.Medal2/>:i===2?<E.Medal3/>:"•"} {c.name}</span>
                    <div className="text-right"><span className="font-semibold">{formatCurrency(c.totalBusiness)}</span>{c.balance>0&&<span className="text-xs text-orange-500 ml-2">Due: {formatCurrency(c.balance)}</span>}</div>
                  </div>
                ))}</div>
              )}
            </div>
            {/* Top Selling Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3"><E.Trophy/> Top Selling Items</h3>
              {data.topItems.length === 0 ? <p className="text-gray-400 text-sm">No item data</p> : (
                <div className="space-y-2">{data.topItems.map((item,i)=>(
                  <div key={i} className="flex justify-between items-center text-sm gap-2">
                    <span className="text-gray-700 inline-flex items-center gap-1.5">{i<3?<E.Flame/>:"•"} {item.description}</span>
                    <div className="text-right"><span className="font-semibold">{formatCurrency(item.revenue)}</span><span className="text-xs text-gray-400 ml-2">×{item.totalQty}</span></div>
                  </div>
                ))}</div>
              )}
            </div>
          </div>

          {/* Pending Payments Table */}
          {data.pendingPayments && data.pendingPayments.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-3"><E.Hourglass/> Pending Payments ({data.pendingPayments.length})</h3>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase"><th className="px-3 py-2 text-left">Invoice</th><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
              <tbody className="divide-y divide-gray-50">{data.pendingPayments.map(p=>(
                <tr key={p.id} className="hover:bg-gray-50"><td className="px-3 py-2 font-mono text-xs text-blue-700">{p.invoiceNumber}</td><td className="px-3 py-2 text-gray-700">{p.customerName||"Walk-in"}</td><td className="px-3 py-2 text-right">{formatCurrency(p.grandTotal)}</td><td className="px-3 py-2 text-right text-green-600">{formatCurrency(p.paidAmount)}</td><td className="px-3 py-2 text-right font-semibold text-orange-600">{formatCurrency(p.balanceAmount)}</td></tr>
              ))}</tbody></table></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SC({icon,label,value,sub,color}:{icon:ReactNode;label:string;value:string;sub?:string;color:string}){
  return <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white`}><div className="text-xl mb-1 inline-flex">{icon}</div><div className="text-lg font-bold truncate">{value}</div><div className="text-[11px] text-white/80">{label}</div>{sub&&<div className="text-[10px] text-white/60">{sub}</div>}</div>;
}
function Row({label,value,cls}:{label:ReactNode;value:string;cls?:string}){
  return <div className="flex justify-between items-center"><span className="text-gray-500 inline-flex items-center gap-1.5">{label}</span><span className={cls||"font-medium text-gray-800"}>{value}</span></div>;
}