"use client";

import { useState, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/constants";

interface SearchResult {
  invoices: Array<{ id:number; invoiceNumber:string; customerName:string|null; grandTotal:number; paymentStatus:string; createdAt:string }>;
  quotations: Array<{ id:number; invoiceNumber:string; customerName:string|null; grandTotal:number; status:string; createdAt:string }>;
  customers: Array<{ id:number; name:string; phone:string|null; email:string|null; balance:number }>;
  expenses: Array<{ id:number; expenseNumber:string; description:string; categoryName:string; amount:number; expenseDate:string }>;
  purchases: Array<{ id:number; purchaseNumber:string; description:string; vendorName:string; totalAmount:number; purchaseDate:string }>;
}

type FilterType = "all" | "invoices" | "quotations" | "customers" | "expenses" | "purchases";

interface SearchProps {
  onLoadInvoice: (id: number) => void;
  onViewCustomer: (id: number) => void;
}

export default function Search({ onLoadInvoice, onViewCustomer }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${filter}`);
      setResults(await res.json());
    } catch (e) { console.error("Search error:", e); }
    finally { setLoading(false); }
  }, [filter]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    const t = setTimeout(() => search(q), 300);
    return () => clearTimeout(t);
  };

  const totalResults = (results?.invoices?.length||0) + (results?.quotations?.length||0) + (results?.customers?.length||0) + (results?.expenses?.length||0) + (results?.purchases?.length||0);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "invoices", label: "📄 Invoices" },
    { key: "quotations", label: "📋 Quotations" },
    { key: "customers", label: "👥 Customers" },
    { key: "expenses", label: "💸 Expenses" },
    { key: "purchases", label: "🛒 Purchases" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="relative">
          <input type="text" value={query} onChange={(e) => handleQueryChange(e.target.value)} placeholder="Search invoices, customers, expenses, purchases..." className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" autoFocus />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
          {loading && <span className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin">⏳</span>}
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          {filters.map((f) => (
            <button key={f.key} onClick={() => { setFilter(f.key); if (query.length >= 2) search(query); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {query.length >= 2 && (
        <div className="space-y-4">
          {results && totalResults === 0 && !loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-4xl mb-3">🔍</div><p className="text-gray-400">No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {/* Invoices */}
          {results?.invoices && results.invoices.length > 0 && (filter === "all" || filter === "invoices") && (
            <ResultSection title="📄 Invoices" count={results.invoices.length}>
              {results.invoices.map((inv) => (
                <div key={inv.id} onClick={() => onLoadInvoice(inv.id)} className="px-5 py-3 flex justify-between items-center hover:bg-blue-50 cursor-pointer transition-colors">
                  <div><div className="font-semibold text-blue-700">{inv.invoiceNumber}</div><div className="text-xs text-gray-400">{inv.customerName || "Walk-in"} · {formatDate(inv.createdAt)}</div></div>
                  <div className="text-right"><div className="font-semibold">{formatCurrency(inv.grandTotal)}</div><span className={`text-[10px] px-2 py-0.5 rounded-full ${inv.paymentStatus==="paid"?"bg-green-100 text-green-700":inv.paymentStatus==="partial"?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-600"}`}>{inv.paymentStatus}</span></div>
                </div>
              ))}
            </ResultSection>
          )}

          {/* Quotations */}
          {results?.quotations && results.quotations.length > 0 && (filter === "all" || filter === "quotations") && (
            <ResultSection title="📋 Quotations" count={results.quotations.length}>
              {results.quotations.map((q) => (
                <div key={q.id} onClick={() => onLoadInvoice(q.id)} className="px-5 py-3 flex justify-between items-center hover:bg-purple-50 cursor-pointer transition-colors">
                  <div><div className="font-semibold text-purple-700">{q.invoiceNumber}</div><div className="text-xs text-gray-400">{q.customerName || "Walk-in"} · {formatDate(q.createdAt)}</div></div>
                  <div className="font-semibold">{formatCurrency(q.grandTotal)}</div>
                </div>
              ))}
            </ResultSection>
          )}

          {/* Customers */}
          {results?.customers && results.customers.length > 0 && (filter === "all" || filter === "customers") && (
            <ResultSection title="👥 Customers" count={results.customers.length}>
              {results.customers.map((c) => (
                <div key={c.id} onClick={() => onViewCustomer(c.id)} className="px-5 py-3 flex justify-between items-center hover:bg-cyan-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-700 font-bold">{c.name.charAt(0).toUpperCase()}</div>
                    <div><div className="font-semibold text-gray-800">{c.name}</div><div className="text-xs text-gray-400">{c.phone && `📱 ${c.phone}`} {c.email && `✉️ ${c.email}`}</div></div>
                  </div>
                  {(c.balance||0) > 0 && <span className="text-sm font-semibold text-orange-600">Due: {formatCurrency(c.balance)}</span>}
                </div>
              ))}
            </ResultSection>
          )}

          {/* Expenses */}
          {results?.expenses && results.expenses.length > 0 && (filter === "all" || filter === "expenses") && (
            <ResultSection title="💸 Expenses" count={results.expenses.length}>
              {results.expenses.map((e) => (
                <div key={e.id} className="px-5 py-3 flex justify-between items-center hover:bg-red-50 transition-colors">
                  <div><div className="font-semibold text-gray-800">{e.description}</div><div className="text-xs text-gray-400">{e.expenseNumber} · {e.categoryName} · {formatDate(e.expenseDate)}</div></div>
                  <div className="font-semibold text-red-600">{formatCurrency(e.amount)}</div>
                </div>
              ))}
            </ResultSection>
          )}

          {/* Purchases */}
          {results?.purchases && results.purchases.length > 0 && (filter === "all" || filter === "purchases") && (
            <ResultSection title="🛒 Purchases" count={results.purchases.length}>
              {results.purchases.map((p) => (
                <div key={p.id} className="px-5 py-3 flex justify-between items-center hover:bg-purple-50 transition-colors">
                  <div><div className="font-semibold text-gray-800">{p.description}</div><div className="text-xs text-gray-400">{p.purchaseNumber} · {p.vendorName} · {formatDate(p.purchaseDate)}</div></div>
                  <div className="font-semibold text-purple-700">{formatCurrency(p.totalAmount)}</div>
                </div>
              ))}
            </ResultSection>
          )}
        </div>
      )}

      {query.length < 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">🔎</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Search Everything</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">Search invoices, quotations, customers, expenses, purchases by number, name, phone, or description.</p>
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="font-bold text-gray-800">{title} ({count})</h3>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}