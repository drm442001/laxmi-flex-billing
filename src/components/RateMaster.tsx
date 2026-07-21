"use client";

import { useState } from "react";

interface RateRecord {
  id: number;
  category: string;
  itemName: string;
  itemCode?: string;
  hsnCode?: string;
  defaultRate: number;
  unit: string;
  gstPercent?: number;
}

interface RateMasterProps {
  rates: RateRecord[];
  onRateUpdate: (id: number, newRate: number) => void;
}

export default function RateMaster({ rates, onRateUpdate }: RateMasterProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");

  const filteredRates = filter === "all" ? rates : rates.filter((r) => r.category === filter);

  const handleSave = (id: number) => {
    onRateUpdate(id, parseFloat(editValue) || 0);
    setEditingId(null);
    setEditValue("");
  };

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case "print": return "🖨️ Print";
      case "frame": return "🔲 Frame";
      case "other": return "📦 Other";
      default: return cat;
    }
  };

  const categoryColor = (cat: string) => {
    switch (cat) {
      case "print": return "bg-blue-100 text-blue-700";
      case "frame": return "bg-orange-100 text-orange-700";
      case "other": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
            💰 Rate Master
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Default rates auto-fill when creating estimates. HSN codes appear on Tax Invoices.
          </p>

          <div className="flex gap-2">
            {[
              { key: "all", label: "All" },
              { key: "print", label: "🖨️ Print" },
              { key: "frame", label: "🔲 Frame" },
              { key: "other", label: "📦 Other" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2 bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-100">
          <div className="col-span-1">Type</div>
          <div className="col-span-4">Item Name</div>
          <div className="col-span-1">HSN</div>
          <div className="col-span-1">Unit</div>
          <div className="col-span-2 text-right">Rate (₹)</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredRates.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No rates configured yet.</p>
            </div>
          ) : (
            filteredRates.map((rate) => (
              <div
                key={rate.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="sm:col-span-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor(rate.category)}`}>
                    {categoryLabel(rate.category)}
                  </span>
                </div>
                <div className="sm:col-span-4">
                  <div className="font-medium text-gray-800 text-sm">{rate.itemName}</div>
                  <div className="text-xs text-gray-400 sm:hidden">{rate.unit} · HSN: {rate.hsnCode || "-"}</div>
                </div>
                <div className="sm:col-span-1 hidden sm:block">
                  <span className="text-xs font-mono text-gray-500">{rate.hsnCode || "-"}</span>
                </div>
                <div className="sm:col-span-1 hidden sm:block">
                  <span className="text-xs text-gray-400">{rate.unit}</span>
                </div>
                <div className="sm:col-span-2 sm:text-right">
                  {editingId === rate.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-24 px-2 py-1.5 border border-blue-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(rate.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <span className={`text-sm font-semibold ${rate.defaultRate > 0 ? "text-gray-800" : "text-gray-300"}`}>
                      ₹{rate.defaultRate.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="sm:col-span-3 flex justify-end gap-1">
                  {editingId === rate.id ? (
                    <>
                      <button onClick={() => handleSave(rate.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-300">Cancel</button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setEditingId(rate.id); setEditValue(rate.defaultRate.toString()); }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200"
                    >
                      ✏️ Edit Rate
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}