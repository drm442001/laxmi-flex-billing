"use client";

import { LineItem } from "@/lib/constants";

interface ItemsListProps {
  items: LineItem[];
  onEdit: (item: LineItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (item: LineItem) => void;
}

export default function ItemsList({ items, onEdit, onDelete, onDuplicate }: ItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-gray-400 text-sm">No items added yet. Use the form above to add items.</p>
      </div>
    );
  }

  const formatNum = (n: number | undefined) => {
    if (!n || n === 0) return "-";
    return n.toFixed(2);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-800">
          📋 Items ({items.length})
        </h3>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <th className="px-3 py-3 text-left w-12">#</th>
              <th className="px-3 py-3 text-left">Description</th>
              <th className="px-3 py-3 text-right w-16">W</th>
              <th className="px-3 py-3 text-right w-16">WS</th>
              <th className="px-3 py-3 text-right w-16">H</th>
              <th className="px-3 py-3 text-right w-16">HS</th>
              <th className="px-3 py-3 text-right w-16">Qty</th>
              <th className="px-3 py-3 text-right w-20">Total Fit</th>
              <th className="px-3 py-3 text-right w-20">Rate</th>
              <th className="px-3 py-3 text-right w-24">Amount</th>
              <th className="px-3 py-3 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={item.id}
                className="border-b border-gray-50 hover:bg-brand-50/30 transition-colors"
              >
                <td className="px-3 py-2.5 text-gray-400 font-medium">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-gray-800">{item.description}</div>
                  <div className="text-xs text-gray-400">
                    {item.category === "print" ? "Print" : item.category === "frame" ? "Frame" : "Other"}
                    {item.size ? ` • ${item.size}` : ""}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">{formatNum(item.width)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{formatNum(item.wSupport)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{formatNum(item.height)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{formatNum(item.hSupport)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{formatNum(item.quantity)}</td>
                <td className="px-3 py-2.5 text-right font-medium text-gray-700">
                  {item.totalFit > 0 ? (
                    <>
                      {formatNum(item.totalFit)}
                      <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-600">₹{formatNum(item.rate)}</td>
                <td className="px-3 py-2.5 text-right font-bold text-gray-800">₹{formatNum(item.amount)}</td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDuplicate(item)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      title="Duplicate"
                    >
                      📄
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-gray-100">
        {items.map((item, i) => (
          <div key={item.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-gray-400 font-medium">#{i + 1}</span>
                <h4 className="font-semibold text-gray-800">{item.description}</h4>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  {item.category === "print" ? "Print" : item.category === "frame" ? "Frame" : "Other"}
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-800">₹{formatNum(item.amount)}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-2">
              {item.width > 0 && <div>W: {item.width}</div>}
              {item.height > 0 && <div>H: {item.height}</div>}
              <div>Qty: {item.quantity}</div>
              {item.totalFit > 0 && (
                <div>
                  Fit: {formatNum(item.totalFit)} {item.unit}
                </div>
              )}
              <div>Rate: ₹{formatNum(item.rate)}</div>
              {item.size && <div>Size: {item.size}</div>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="flex-1 text-center py-1.5 text-xs bg-brand-50 text-brand-600 rounded-lg font-medium"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => onDuplicate(item)}
                className="flex-1 text-center py-1.5 text-xs bg-green-50 text-green-600 rounded-lg font-medium"
              >
                📄 Duplicate
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="flex-1 text-center py-1.5 text-xs bg-red-50 text-red-500 rounded-lg font-medium"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}