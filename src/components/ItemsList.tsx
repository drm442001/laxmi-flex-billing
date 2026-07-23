"use client";

import { LineItem } from "@/lib/constants";
import { formatCurrency } from "@/lib/constants";
import { E } from "@/components/emojis";

interface ItemsListProps {
  items: LineItem[];
  onEdit: (item: LineItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (item: LineItem) => void;
  onAddItem?: () => void;
}

export default function ItemsList({ items, onEdit, onDelete, onDuplicate, onAddItem }: ItemsListProps) {
  // Totals
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalAmount = items.reduce((s, i) => s + (i.amount || 0), 0);
  const totalFit = items.reduce((s, i) => s + (i.totalFit || 0), 0);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 text-center">
          <div className="text-4xl mb-3"><E.Clipboard/></div>
          <p className="text-gray-400 text-sm">No items added yet. Use the form above to add items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Table styled like classic flex-billing register */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="border border-blue-800 px-2 py-2 text-center w-12">Sr.<br/>No.</th>
              <th className="border border-blue-800 px-2 py-2 text-left">Description</th>
              <th className="border border-blue-800 px-2 py-2 text-center w-20">Height</th>
              <th className="border border-blue-800 bg-blue-600 px-2 py-2 text-center w-12">H</th>
              <th className="border border-blue-800 px-2 py-2 text-center w-20">Width</th>
              <th className="border border-blue-800 bg-blue-600 px-2 py-2 text-center w-12">W</th>
              <th className="border border-blue-800 px-2 py-2 text-center w-20">Quantity</th>
              <th className="border border-blue-800 px-2 py-2 text-center w-24">Total Fit</th>
              <th className="border border-blue-800 px-2 py-2 text-right w-24">Rate</th>
              <th className="border border-blue-800 px-2 py-2 text-right w-28">Amount</th>
              <th className="border border-blue-800 px-2 py-2 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="hover:bg-blue-50/50 even:bg-gray-50/40">
                <td className="border border-gray-300 px-2 py-2 text-center text-gray-700 font-medium align-top">{i + 1}</td>
                <td className="border border-gray-300 px-2 py-2 align-top">
                  <div className="font-medium text-gray-800">{item.description}</div>
                  <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-2">
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase">
                      {item.category}
                    </span>
                    {item.size && <span className="text-gray-500">Size: {item.size}</span>}
                    {item.hsnCode && <span className="text-gray-500">HSN: {item.hsnCode}</span>}
                  </div>
                  {/* Inline inputs (mirroring the classic register look: editable cells) */}
                  <ItemRowEditor item={item} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center text-gray-700 align-top bg-blue-50/30">
                  {item.height > 0 ? item.height : ""}
                </td>
                <td className="border border-gray-300 px-1 py-2 text-center align-top bg-blue-100/50"></td>
                <td className="border border-gray-300 px-2 py-2 text-center text-gray-700 align-top bg-blue-50/30">
                  {item.width > 0 ? item.width : ""}
                </td>
                <td className="border border-gray-300 px-1 py-2 text-center align-top bg-blue-100/50"></td>
                <td className="border border-gray-300 px-2 py-2 text-center text-gray-700 align-top">{item.quantity || ""}</td>
                <td className="border border-gray-300 px-2 py-2 text-center text-gray-700 align-top font-medium">
                  {item.totalFit > 0 ? (
                    <span>{item.totalFit.toFixed(2)} <span className="text-xs text-gray-400">{item.unit}</span></span>
                  ) : "–"}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right text-gray-700 align-top">
                  {item.rate > 0 ? `₹${item.rate.toFixed(2)}` : ""}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-right font-bold text-gray-900 align-top bg-yellow-50/60">
                  ₹{(item.amount || 0).toFixed(2)}
                </td>
                <td className="border border-gray-300 px-1 py-2 text-center align-top">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-all"
                      title="Edit"
                    ><E.Pencil/></button>
                    <button
                      onClick={() => onDuplicate(item)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all"
                      title="Duplicate"
                    ><E.Doc/></button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all"
                      title="Delete"
                    ><E.Trash/></button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-yellow-50 font-bold">
              <td className="border border-gray-300 px-2 py-2 text-center" colSpan={6}>TOTAL</td>
              <td className="border border-gray-300 px-2 py-2 text-center">{totalQty.toFixed(0)}</td>
              <td className="border border-gray-300 px-2 py-2 text-center">
                {totalFit > 0 ? totalFit.toFixed(2) : ""}
              </td>
              <td className="border border-gray-300 px-2 py-2"></td>
              <td className="border border-gray-300 px-2 py-2 text-right text-blue-800 text-base">
                ₹{totalAmount.toFixed(2)}
              </td>
              <td className="border border-gray-300 px-2 py-2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inline "editor" is intentionally minimal: the add/edit form above is still the
// primary place to edit. This component just renders the action buttons.
function ItemRowEditor(_: { item: LineItem; onEdit: (i: LineItem) => void; onDelete: (id: string) => void; onDuplicate: (i: LineItem) => void; }) {
  return null;
}
