"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDateTime } from "@/lib/constants";
import { E } from "@/components/emojis";

interface TrashedItem {
  id: number;
  invoiceNumber: string;
  type: string;
  customerName: string | null;
  grandTotal: number;
  deletedAt: string;
  createdAt: string;
}

interface TrashProps {
  showToast: (message: string, type?: string) => void;
}

export default function Trash({ showToast }: TrashProps) {
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trash");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (id: number) => {
    try {
      const res = await fetch("/api/trash", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showToast("Item restored!");
        fetchTrash();
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to restore", "error");
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm("Permanently delete this item? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/trash?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Permanently deleted!");
        fetchTrash();
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to delete", "error");
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Empty entire trash? All items will be permanently deleted.")) return;

    try {
      const res = await fetch("/api/trash?all=true", { method: "DELETE" });
      if (res.ok) {
        showToast("Trash emptied!");
        fetchTrash();
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to empty trash", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-pulse"><E.Trash/></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <E.Trash/> Trash
          </h2>
          <p className="text-sm text-gray-400">
            Deleted items can be restored or permanently removed
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-all"
          >
            <E.Trash/> Empty Trash
          </button>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4"><E.Broom/></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Trash is Empty</h3>
            <p className="text-gray-400 text-sm">
              Deleted invoices, quotations, and calculations will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl inline-flex items-center">
                      {item.type === "invoice" ? <E.Doc/> : item.type === "quotation" ? <E.Clipboard/> : <E.Calc/>}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-800">{item.invoiceNumber}</div>
                      <div className="text-xs text-gray-400">
                        {item.customerName || "Walk-in"} •{" "}
                        <span className="capitalize">{item.type}</span>
                      </div>
                      <div className="text-xs text-red-400 mt-1">
                        Deleted: {formatDateTime(item.deletedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{formatCurrency(item.grandTotal)}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="px-3 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100"
                      >
                        <E.Undo/> Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id)}
                        className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100"
                      >
                        <E.X/> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-sm text-yellow-800">
        <strong><E.Warn/> Note:</strong> Items in trash can be restored at any time. Permanently deleted items cannot be recovered.
      </div>
    </div>
  );
}