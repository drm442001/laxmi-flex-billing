"use client";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { formatCurrency, formatDate, PAYMENT_METHODS, EXPENSE_CATEGORIES } from "@/lib/constants";
import { E } from "@/components/emojis";

/* ── shared types ─────────────────────────── */
interface Expense { id:number; expenseNumber:string; categoryName:string; vendorName:string; description:string; amount:number; paymentMethod:string; billNumber:string|null; expenseDate:string; notes:string|null; }
interface Purchase { id:number; purchaseNumber:string; vendorName:string; description:string; quantity:number; rate:number; amount:number; gstAmount:number; totalAmount:number; paymentMethod:string; paidAmount:number; balanceAmount:number; paymentStatus:string; purchaseDate:string; notes:string|null; }
interface CashEntry { id:number; entryDate:string; entryType:string; referenceNumber:string|null; particulars:string; debit:number; credit:number; runningBalance:number; paymentMethod:string|null; }
interface LedgerEntry { id:number; entryDate:string; accountType:string; accountName:string; referenceNumber:string|null; particulars:string; debit:number; credit:number; }
interface CashSummary { totalDebit:number; totalCredit:number; balance:number; }

interface AccountsProps { showToast:(m:string,t?:string)=>void; initialTab?:string; }

export default function Accounts({ showToast, initialTab }:AccountsProps) {
  const [tab, setTab] = useState(initialTab || "expenses");
  /* expenses */
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpModal, setShowExpModal] = useState(false);
  const [expForm, setExpForm] = useState({ categoryName:"", vendorName:"", description:"", amount:"", paymentMethod:"cash", billNumber:"", expenseDate:new Date().toISOString().split("T")[0], notes:"" });
  /* purchases */
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showPurModal, setShowPurModal] = useState(false);
  const [purForm, setPurForm] = useState({ vendorName:"", description:"", quantity:"1", rate:"", amount:"", gstAmount:"0", totalAmount:"", paymentMethod:"cash", paidAmount:"", purchaseDate:new Date().toISOString().split("T")[0], notes:"" });
  /* cashbook */
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [cashSummary, setCashSummary] = useState<CashSummary>({ totalDebit:0, totalCredit:0, balance:0 });
  /* ledger */
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerFilter, setLedgerFilter] = useState("");
  const [loading, setLoading] = useState(false);

  /* ── loaders ─────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "expenses") { const r = await fetch("/api/expenses"); setExpenses(await r.json()); }
      if (tab === "purchases") { const r = await fetch("/api/purchases"); setPurchases(await r.json()); }
      if (tab === "cashbook") { const r = await fetch("/api/cashbook"); const d = await r.json(); setCashEntries(d.entries||[]); setCashSummary(d.summary||{ totalDebit:0,totalCredit:0,balance:0 }); }
      if (tab === "ledger") { const url = ledgerFilter ? `/api/ledger?accountType=${ledgerFilter}` : "/api/ledger"; const r = await fetch(url); const d = await r.json(); setLedgerEntries(d.entries||[]); }
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [tab, ledgerFilter]);

  useEffect(() => { load(); }, [load]);

  /* ── save expense ────────────────────────── */
  const saveExpense = async () => {
    if (!expForm.description||!expForm.amount) { showToast("Fill description & amount","error"); return; }
    const res = await fetch("/api/expenses", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ ...expForm, amount:parseFloat(expForm.amount) }) });
    if (res.ok) { showToast("Expense saved!"); setShowExpModal(false); setExpForm({ categoryName:"", vendorName:"", description:"", amount:"", paymentMethod:"cash", billNumber:"", expenseDate:new Date().toISOString().split("T")[0], notes:"" }); load(); }
    else showToast("Failed","error");
  };

  /* ── save purchase ───────────────────────── */
  const savePurchase = async () => {
    if (!purForm.description||!purForm.totalAmount) { showToast("Fill description & total","error"); return; }
    const res = await fetch("/api/purchases", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ ...purForm, quantity:parseFloat(purForm.quantity)||1, rate:parseFloat(purForm.rate)||0, amount:parseFloat(purForm.amount)||0, gstAmount:parseFloat(purForm.gstAmount)||0, totalAmount:parseFloat(purForm.totalAmount), paidAmount:parseFloat(purForm.paidAmount)||0 }) });
    if (res.ok) { showToast("Purchase saved!"); setShowPurModal(false); setPurForm({ vendorName:"", description:"", quantity:"1", rate:"", amount:"", gstAmount:"0", totalAmount:"", paymentMethod:"cash", paidAmount:"", purchaseDate:new Date().toISOString().split("T")[0], notes:"" }); load(); }
    else showToast("Failed","error");
  };

  const inp = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white";
  const lbl = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  const tabs:{ key:string; label:ReactNode }[] = [
    { key:"expenses", label:<><E.RupeeCircle/> Expenses</> },
    { key:"purchases", label:<><E.Cart/> Purchases</> },
    { key:"cashbook", label:<><E.Ledger/> Cash Book</> },
    { key:"ledger", label:<><E.Book/> Ledger</> },
  ];

  const totalExp = expenses.reduce((s,e)=>s+e.amount,0);
  const totalPur = purchases.reduce((s,p)=>s+p.totalAmount,0);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t.key?"bg-blue-600 text-white shadow-sm":"bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>{t.label}</button>
        ))}
      </div>

      {/* ────── EXPENSES TAB ────── */}
      {tab === "expenses" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white"><div className="text-2xl mb-1"><E.RupeeCircle/></div><div className="text-2xl font-bold">{formatCurrency(totalExp)}</div><div className="text-sm text-white/80">Total Expenses</div></div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white"><div className="text-2xl mb-1"><E.Note/></div><div className="text-2xl font-bold">{expenses.length}</div><div className="text-sm text-white/80">Entries</div></div>
          </div>
          <div className="flex justify-end"><button onClick={()=>setShowExpModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700">+ Add Expense</button></div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading?<div className="p-12 text-center text-4xl animate-pulse"><E.RupeeCircle/></div>:expenses.length===0?<div className="p-12 text-center text-gray-400">No expenses recorded</div>:(
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase"><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-left">Method</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-gray-50">{expenses.map(e=>(
                <tr key={e.id} className="hover:bg-gray-50"><td className="px-4 py-3">{formatDate(e.expenseDate)}</td><td className="px-4 py-3 font-mono text-xs text-gray-400">{e.expenseNumber}</td><td className="px-4 py-3"><span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs">{e.categoryName||"General"}</span></td><td className="px-4 py-3 text-gray-700">{e.description}</td><td className="px-4 py-3 text-xs text-gray-400">{e.paymentMethod}</td><td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(e.amount)}</td></tr>
              ))}</tbody></table></div>
            )}
          </div>
          {/* Expense Modal */}
          {showExpModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-lg"><E.RupeeCircle/> Add Expense</h3><button onClick={()=>setShowExpModal(false)} className="text-gray-400 hover:text-gray-600 text-xl"><E.X/></button></div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Category</label><select value={expForm.categoryName} onChange={e=>setExpForm({...expForm,categoryName:e.target.value})} className={inp}><option value="">Select</option>{EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className={lbl}>Vendor</label><input value={expForm.vendorName} onChange={e=>setExpForm({...expForm,vendorName:e.target.value})} className={inp} placeholder="Vendor name"/></div>
                </div>
                <div><label className={lbl}>Description *</label><input value={expForm.description} onChange={e=>setExpForm({...expForm,description:e.target.value})} className={inp} placeholder="Expense description"/></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={lbl}>Amount *</label><input type="number" value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})} className={inp}/></div>
                  <div><label className={lbl}>Method</label><select value={expForm.paymentMethod} onChange={e=>setExpForm({...expForm,paymentMethod:e.target.value})} className={inp}>{PAYMENT_METHODS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                  <div><label className={lbl}>Date</label><input type="date" value={expForm.expenseDate} onChange={e=>setExpForm({...expForm,expenseDate:e.target.value})} className={inp}/></div>
                </div>
                <div><label className={lbl}>Bill Number</label><input value={expForm.billNumber} onChange={e=>setExpForm({...expForm,billNumber:e.target.value})} className={inp}/></div>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3"><button onClick={()=>setShowExpModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200">Cancel</button><button onClick={saveExpense} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700"><E.RupeeCircle/> Save Expense</button></div>
            </div></div>
          )}
        </>
      )}

      {/* ────── PURCHASES TAB ────── */}
      {tab === "purchases" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white"><div className="text-2xl mb-1"><E.Cart/></div><div className="text-2xl font-bold">{formatCurrency(totalPur)}</div><div className="text-sm text-white/80">Total Purchases</div></div>
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white"><div className="text-2xl mb-1"><E.Note/></div><div className="text-2xl font-bold">{purchases.length}</div><div className="text-sm text-white/80">Entries</div></div>
          </div>
          <div className="flex justify-end"><button onClick={()=>setShowPurModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700">+ Add Purchase</button></div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading?<div className="p-12 text-center text-4xl animate-pulse"><E.Cart/></div>:purchases.length===0?<div className="p-12 text-center text-gray-400">No purchases recorded</div>:(
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase"><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Vendor</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-center">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-50">{purchases.map(p=>(
                <tr key={p.id} className="hover:bg-gray-50"><td className="px-4 py-3">{formatDate(p.purchaseDate)}</td><td className="px-4 py-3 font-mono text-xs text-gray-400">{p.purchaseNumber}</td><td className="px-4 py-3">{p.vendorName||"-"}</td><td className="px-4 py-3 text-gray-700">{p.description}</td><td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.totalAmount)}</td><td className="px-4 py-3 text-right text-green-600">{formatCurrency(p.paidAmount)}</td><td className="px-4 py-3 text-right text-orange-600">{formatCurrency(p.balanceAmount)}</td><td className="px-4 py-3 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full ${p.paymentStatus==="paid"?"bg-green-100 text-green-700":p.paymentStatus==="partial"?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-600"}`}>{p.paymentStatus}</span></td></tr>
              ))}</tbody></table></div>
            )}
          </div>
          {/* Purchase Modal */}
          {showPurModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10"><h3 className="font-bold text-lg"><E.Cart/> Add Purchase</h3><button onClick={()=>setShowPurModal(false)} className="text-gray-400 hover:text-gray-600 text-xl"><E.X/></button></div>
              <div className="p-5 space-y-4">
                <div><label className={lbl}>Vendor Name</label><input value={purForm.vendorName} onChange={e=>setPurForm({...purForm,vendorName:e.target.value})} className={inp}/></div>
                <div><label className={lbl}>Description *</label><input value={purForm.description} onChange={e=>setPurForm({...purForm,description:e.target.value})} className={inp}/></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={lbl}>Qty</label><input type="number" value={purForm.quantity} onChange={e=>{const q=e.target.value; const r=purForm.rate; const a=parseFloat(q)*parseFloat(r)||0; setPurForm({...purForm,quantity:q,amount:a.toFixed(2),totalAmount:(a+parseFloat(purForm.gstAmount||"0")).toFixed(2)});}} className={inp}/></div>
                  <div><label className={lbl}>Rate</label><input type="number" value={purForm.rate} onChange={e=>{const r=e.target.value; const a=parseFloat(purForm.quantity)*parseFloat(r)||0; setPurForm({...purForm,rate:r,amount:a.toFixed(2),totalAmount:(a+parseFloat(purForm.gstAmount||"0")).toFixed(2)});}} className={inp}/></div>
                  <div><label className={lbl}>Amount</label><input type="number" value={purForm.amount} onChange={e=>setPurForm({...purForm,amount:e.target.value,totalAmount:(parseFloat(e.target.value)+parseFloat(purForm.gstAmount||"0")).toFixed(2)})} className={inp}/></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={lbl}>GST Amount</label><input type="number" value={purForm.gstAmount} onChange={e=>setPurForm({...purForm,gstAmount:e.target.value,totalAmount:(parseFloat(purForm.amount||"0")+parseFloat(e.target.value||"0")).toFixed(2)})} className={inp}/></div>
                  <div><label className={lbl}>Total *</label><input type="number" value={purForm.totalAmount} onChange={e=>setPurForm({...purForm,totalAmount:e.target.value})} className={`${inp} font-bold`}/></div>
                  <div><label className={lbl}>Paid</label><input type="number" value={purForm.paidAmount} onChange={e=>setPurForm({...purForm,paidAmount:e.target.value})} className={inp}/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Method</label><select value={purForm.paymentMethod} onChange={e=>setPurForm({...purForm,paymentMethod:e.target.value})} className={inp}>{PAYMENT_METHODS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                  <div><label className={lbl}>Date</label><input type="date" value={purForm.purchaseDate} onChange={e=>setPurForm({...purForm,purchaseDate:e.target.value})} className={inp}/></div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white"><button onClick={()=>setShowPurModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200">Cancel</button><button onClick={savePurchase} className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700"><E.Cart/> Save Purchase</button></div>
            </div></div>
          )}
        </>
      )}

      {/* ────── CASH BOOK TAB ────── */}
      {tab === "cashbook" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white"><div className="text-2xl mb-1"><E.Inbox/></div><div className="text-2xl font-bold">{formatCurrency(cashSummary.totalDebit)}</div><div className="text-sm text-white/80">Total In (Debit)</div></div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white"><div className="text-2xl mb-1"><E.Outbox/></div><div className="text-2xl font-bold">{formatCurrency(cashSummary.totalCredit)}</div><div className="text-sm text-white/80">Total Out (Credit)</div></div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white"><div className="text-2xl mb-1"><E.Money/></div><div className="text-2xl font-bold">{formatCurrency(cashSummary.balance)}</div><div className="text-sm text-white/80">Cash Balance</div></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading?<div className="p-12 text-center text-4xl animate-pulse"><E.Ledger/></div>:cashEntries.length===0?<div className="p-12 text-center text-gray-400">No entries yet. Transactions auto-post here.</div>:(
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase"><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Ref</th><th className="px-4 py-3 text-left">Particulars</th><th className="px-4 py-3 text-left">Method</th><th className="px-4 py-3 text-right text-green-600">Debit (In)</th><th className="px-4 py-3 text-right text-red-600">Credit (Out)</th><th className="px-4 py-3 text-right">Balance</th></tr></thead>
              <tbody className="divide-y divide-gray-50">{cashEntries.map(e=>(
                <tr key={e.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-xs">{formatDate(e.entryDate)}</td><td className="px-4 py-3 font-mono text-xs text-gray-400">{e.referenceNumber||"-"}</td><td className="px-4 py-3 text-gray-700">{e.particulars}</td><td className="px-4 py-3 text-xs text-gray-400">{e.paymentMethod||"-"}</td><td className="px-4 py-3 text-right text-green-600 font-medium">{e.debit>0?formatCurrency(e.debit):"-"}</td><td className="px-4 py-3 text-right text-red-600 font-medium">{e.credit>0?formatCurrency(e.credit):"-"}</td><td className="px-4 py-3 text-right font-semibold">{formatCurrency(e.runningBalance)}</td></tr>
              ))}</tbody></table></div>
            )}
          </div>
        </>
      )}

      {/* ────── LEDGER TAB ────── */}
      {tab === "ledger" && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            {[
              { k: "", label: <><E.Book/> All</> },
              { k: "customer", label: "Customers" },
              { k: "vendor", label: "Vendors" },
              { k: "expense", label: "Expenses" },
              { k: "income", label: "Incomes" },
            ].map(b=>(
              <button key={b.k} onClick={()=>setLedgerFilter(b.k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 ${ledgerFilter===b.k?"bg-blue-600 text-white":"bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>{b.label}</button>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading?<div className="p-12 text-center text-4xl animate-pulse"><E.Book/></div>:ledgerEntries.length===0?<div className="p-12 text-center text-gray-400">Ledger is empty. Transactions auto-post here.</div>:(
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase"><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Account</th><th className="px-4 py-3 text-left">Ref</th><th className="px-4 py-3 text-left">Particulars</th><th className="px-4 py-3 text-right text-green-600">Debit</th><th className="px-4 py-3 text-right text-red-600">Credit</th></tr></thead>
              <tbody className="divide-y divide-gray-50">{ledgerEntries.map(e=>(
                <tr key={e.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-xs">{formatDate(e.entryDate)}</td><td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${e.accountType==="customer"?"bg-blue-100 text-blue-700":e.accountType==="vendor"?"bg-purple-100 text-purple-700":e.accountType==="expense"?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>{e.accountType}</span> <span className="text-sm text-gray-700 ml-1">{e.accountName}</span></td><td className="px-4 py-3 font-mono text-xs text-gray-400">{e.referenceNumber||"-"}</td><td className="px-4 py-3 text-gray-700">{e.particulars}</td><td className="px-4 py-3 text-right text-green-600 font-medium">{e.debit>0?formatCurrency(e.debit):"-"}</td><td className="px-4 py-3 text-right text-red-600 font-medium">{e.credit>0?formatCurrency(e.credit):"-"}</td></tr>
              ))}</tbody></table></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}