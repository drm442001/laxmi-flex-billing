"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Category,
  CATEGORIES,
  getItemsByCategory,
  calculatePrint,
  calculateFrame,
  parseSize,
  LineItem,
} from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";

interface RateRecord {
  id: number;
  category: string;
  itemName: string;
  defaultRate: number;
  unit: string;
  hsnCode?: string;
}

interface CategoryFormProps {
  onAddItem: (item: LineItem) => void;
  rates: RateRecord[];
  editingItem: LineItem | null;
  onCancelEdit: () => void;
}

export default function CategoryForm({ onAddItem, rates, editingItem, onCancelEdit }: CategoryFormProps) {
  const [category, setCategory] = useState<Category>("print");
  const [description, setDescription] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [wSupport, setWSupport] = useState<string>("");
  const [hSupport, setHSupport] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [rate, setRate] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [size, setSize] = useState<string>("");

  const items = getItemsByCategory(category);

  // Load editing item
  useEffect(() => {
    if (editingItem) {
      setCategory(editingItem.category);
      setDescription(editingItem.description);
      setHsnCode(editingItem.hsnCode || "");
      setWidth(editingItem.width ? editingItem.width.toString() : "");
      setHeight(editingItem.height ? editingItem.height.toString() : "");
      setWSupport(editingItem.wSupport ? editingItem.wSupport.toString() : "");
      setHSupport(editingItem.hSupport ? editingItem.hSupport.toString() : "");
      setQuantity(editingItem.quantity ? editingItem.quantity.toString() : "1");
      setRate(editingItem.rate ? editingItem.rate.toString() : "");
      setAmount(editingItem.amount ? editingItem.amount.toString() : "");
      setSize(editingItem.size || "");
    }
  }, [editingItem]);

  // Auto-fill rate and HSN from Rate Master when description changes
  useEffect(() => {
    if (editingItem) return;
    if (description && rates.length > 0) {
      const rateRecord = rates.find(
        (r) => r.category === category && r.itemName === description
      );
      if (rateRecord) {
        if (rateRecord.defaultRate > 0) {
          setRate(rateRecord.defaultRate.toString());
        }
        if (rateRecord.hsnCode) {
          setHsnCode(rateRecord.hsnCode);
        }
      }
    }
    // Also check from items array for HSN
    const item = items.find((i) => i.name === description);
    if (item && item.hsn) {
      setHsnCode(item.hsn);
    }
  }, [description, category, rates, editingItem, items]);

  // Auto-calculate for "other" category
  const handleOtherCalc = useCallback((field: "quantity" | "rate" | "amount", value: string) => {
    const q = field === "quantity" ? parseFloat(value) || 0 : parseFloat(quantity) || 0;
    const r = field === "rate" ? parseFloat(value) || 0 : parseFloat(rate) || 0;
    const a = field === "amount" ? parseFloat(value) || 0 : parseFloat(amount) || 0;

    if (field === "quantity") {
      setQuantity(value);
      if (r > 0) setAmount((q * r).toFixed(2));
      else if (a > 0 && q > 0) setRate((a / q).toFixed(2));
    } else if (field === "rate") {
      setRate(value);
      if (q > 0) setAmount((q * r).toFixed(2));
      else if (a > 0 && r > 0) setQuantity((a / r).toFixed(2));
    } else {
      setAmount(value);
      if (q > 0 && r === 0) setRate(q > 0 ? (a / q).toFixed(2) : "");
      else if (r > 0 && q === 0) setQuantity(r > 0 ? (a / r).toFixed(2) : "");
    }
  }, [quantity, rate, amount]);

  const resetForm = () => {
    setDescription("");
    setHsnCode("");
    setWidth("");
    setHeight("");
    setWSupport("");
    setHSupport("");
    setQuantity("1");
    setRate("");
    setAmount("");
    setSize("");
  };

  const handleAdd = () => {
    if (!description) return;

    let item: LineItem;
    const baseItem: LineItem = {
      id: editingItem ? editingItem.id : uuidv4(),
      srNo: 0,
      category,
      description,
      hsnCode,
      width: 0,
      wSupport: 0,
      height: 0,
      hSupport: 0,
      quantity: parseFloat(quantity) || 1,
      totalFit: 0,
      unit: "",
      rate: parseFloat(rate) || 0,
      amount: 0,
      size: "",
    };

    if (category === "print") {
      const w = parseFloat(width) || 0;
      const h = parseFloat(height) || 0;
      const q = parseFloat(quantity) || 1;
      const r = parseFloat(rate) || 0;
      if (w <= 0 || h <= 0) return;
      const calc = calculatePrint(w, h, q, r);
      item = {
        ...baseItem,
        width: w,
        height: h,
        totalFit: calc.totalFit,
        unit: "Sq.Ft",
        amount: calc.amount,
      };
    } else if (category === "frame") {
      const w = parseFloat(width) || 0;
      const h = parseFloat(height) || 0;
      const ws = parseFloat(wSupport) || 0;
      const hs = parseFloat(hSupport) || 0;
      const q = parseFloat(quantity) || 1;
      const r = parseFloat(rate) || 0;
      if (w <= 0 || h <= 0) return;
      const calc = calculateFrame(w, ws, h, hs, q, r);
      item = {
        ...baseItem,
        width: w,
        height: h,
        wSupport: ws,
        hSupport: hs,
        totalFit: calc.totalFit,
        unit: "R.Ft",
        amount: calc.amount,
      };
    } else {
      const parsedSize = parseSize(size);
      item = {
        ...baseItem,
        width: parsedSize?.width || 0,
        height: parsedSize?.height || 0,
        size: size,
        amount: parseFloat(amount) || 0,
        unit: "",
      };
    }

    onAddItem(item);
    resetForm();
    if (editingItem) onCancelEdit();
  };

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        {editingItem ? "✏️ Edit Item" : "➕ Add Item"}
      </h2>

      {/* Category + Description Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className={labelClass}>Category</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Category);
              setDescription("");
              setRate("");
              setHsnCode("");
            }}
            className={inputClass}
            disabled={!!editingItem}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Item / Description</label>
          <select
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          >
            <option value="">-- Select Item --</option>
            {items.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>HSN Code</label>
          <input
            type="text"
            value={hsnCode}
            onChange={(e) => setHsnCode(e.target.value)}
            placeholder="HSN"
            className={inputClass}
          />
        </div>
      </div>

      {/* Dynamic Fields based on Category */}
      {category === "print" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className={labelClass}>Width (ft)</label>
            <input
              type="number"
              step="0.01"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Height (ft)</label>
            <input
              type="number"
              step="0.01"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input
              type="number"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Rate (₹/Sq.Ft)</label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {category === "frame" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div>
            <label className={labelClass}>Width (ft)</label>
            <input
              type="number"
              step="0.01"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>W Support</label>
            <input
              type="number"
              step="1"
              value={wSupport}
              onChange={(e) => setWSupport(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Height (ft)</label>
            <input
              type="number"
              step="0.01"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>H Support</label>
            <input
              type="number"
              step="1"
              value={hSupport}
              onChange={(e) => setHSupport(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input
              type="number"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Rate (₹/R.Ft)</label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {category === "other" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className={labelClass}>Size (e.g. 3x5)</label>
            <input
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="3x5"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input
              type="number"
              step="1"
              value={quantity}
              onChange={(e) => handleOtherCalc("quantity", e.target.value)}
              placeholder="1"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Rate (₹)</label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => handleOtherCalc("rate", e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => handleOtherCalc("amount", e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAdd}
          disabled={!description}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
        >
          {editingItem ? "✓ Update Item" : "+ Add Item"}
        </button>
        {editingItem && (
          <button
            onClick={() => {
              onCancelEdit();
              resetForm();
            }}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        )}
        <button
          onClick={resetForm}
          className="px-4 py-2.5 text-gray-500 rounded-lg text-sm hover:bg-gray-100 transition-all"
        >
          Clear
        </button>
      </div>

      {/* Calculation hint */}
      <div className="mt-3 text-xs text-gray-400">
        {category === "print" && "Formula: Width × Height × Quantity × Rate = Amount"}
        {category === "frame" && "Formula: (W calc + H calc) × Quantity × Rate = Amount. W calc: W Support=0 → Width×2, else (W Support+2)×Width"}
        {category === "other" && "Auto-calc: Enter any 2 of Qty/Rate/Amount and the 3rd is calculated"}
      </div>
    </div>
  );
}