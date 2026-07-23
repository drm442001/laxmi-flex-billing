"use client";

import { useState, useEffect, useRef } from "react";
import {
  Category, CATEGORIES, getItemsByCategory,
  calculatePrint, calculateFrame, parseSize, LineItem,
} from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";
import { E } from "@/components/emojis";

interface RateRecord {
  id: number; category: string; itemName: string;
  defaultRate: number; unit: string; hsnCode?: string;
}

interface CategoryFormProps {
  onAddItem: (item: LineItem) => void;
  rates: RateRecord[];
  editingItem: LineItem | null;
  onCancelEdit: () => void;
  invoiceType?: string; // "normal" hides HSN
  categoryRef?: React.RefObject<HTMLSelectElement | null>;
  onFieldsFilled?: () => void;
}

export default function CategoryForm({ onAddItem, rates, editingItem, onCancelEdit, invoiceType = "normal", categoryRef }: CategoryFormProps) {
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

  // Refs for focus management
  const descriptionRef = useRef<HTMLSelectElement | null>(null);
  const widthRef = useRef<HTMLInputElement | null>(null);
  const qtyRef = useRef<HTMLInputElement | null>(null);
  const rateRef = useRef<HTMLInputElement | null>(null);
  const sizeRef = useRef<HTMLInputElement | null>(null);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  const items = getItemsByCategory(category);

  // Auto-select first item when category changes / on mount (no "-- Select Item --")
  useEffect(() => {
    if (editingItem) return;
    if (items.length > 0 && !items.find((i) => i.name === description)) {
      setDescription(items[0].name);
      // Pull rate/HSN for default item
      if (rates.length > 0) {
        const rateRecord = rates.find((r) => r.category === category && r.itemName === items[0].name);
        if (rateRecord) {
          if (rateRecord.defaultRate > 0) setRate(rateRecord.defaultRate.toString());
          if (rateRecord.hsnCode) setHsnCode(rateRecord.hsnCode);
        }
      }
      if (items[0].hsn && invoiceType === "tax") setHsnCode(items[0].hsn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, items.length, editingItem, invoiceType]);

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
      // Focus heading-like area for edit; no perfect target so focus the card
      setTimeout(() => descriptionRef.current?.focus(), 50);
    } else if (items.length > 0 && !description) {
      setDescription(items[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem]);

  useEffect(() => {
    if (editingItem) return;
    if (description && rates.length > 0) {
      const rateRecord = rates.find((r) => r.category === category && r.itemName === description);
      if (rateRecord) {
        if (rateRecord.defaultRate > 0) setRate(rateRecord.defaultRate.toString());
        if (rateRecord.hsnCode) setHsnCode(rateRecord.hsnCode);
      }
    }
    const item = items.find((i) => i.name === description);
    if (item && item.hsn) setHsnCode(item.hsn);
  }, [description, category, rates, editingItem, items]);

  // When category changes, reset related fields and move focus to description
  const onCategoryChange = (val: Category) => {
    setCategory(val);
    setDescription(""); setRate(""); setHsnCode(""); setWidth(""); setHeight("");
    setWSupport(""); setHSupport(""); setSize(""); setQuantity("1"); setAmount("");
    setTimeout(() => descriptionRef.current?.focus(), 30);
  };

  // When description selected, focus next relevant input
  const onDescriptionChange = (val: string) => {
    setDescription(val);
  };

  // Keyboard handler for Category select: Enter/Tab → Description
  const onCategoryKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      descriptionRef.current?.focus();
    }
    // Arrow keys are handled natively by <select>; Tab naturally moves to description.
  };

  // Keyboard handler for Description select: Enter/Tab → next (size or width)
  const onDescriptionKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (category === "other") sizeRef.current?.focus();
      else widthRef.current?.focus();
    }
  };

  const resetForm = () => {
    setDescription(""); setHsnCode(""); setWidth(""); setHeight("");
    setWSupport(""); setHSupport(""); setQuantity("1"); setRate(""); setAmount(""); setSize("");
    // Refocus category for rapid entry
    setTimeout(() => categoryRef?.current?.focus(), 30);
  };

  const handleAdd = () => {
    if (!description) return;

    const baseItem: LineItem = {
      id: editingItem ? editingItem.id : uuidv4(),
      srNo: 0, category, description, hsnCode: invoiceType === "tax" ? hsnCode : undefined,
      width: 0, wSupport: 0, height: 0, hSupport: 0,
      quantity: parseFloat(quantity) || 1, totalFit: 0, unit: "",
      rate: parseFloat(rate) || 0, amount: 0, size: "",
    };

    let item: LineItem;
    if (category === "print") {
      const w = parseFloat(width) || 0; const h = parseFloat(height) || 0;
      const q = parseFloat(quantity) || 1; const r = parseFloat(rate) || 0;
      if (w <= 0 || h <= 0) return;
      const calc = calculatePrint(w, h, q, r);
      item = { ...baseItem, width: w, height: h, totalFit: calc.totalFit, unit: "Sq.Ft", amount: calc.amount };
    } else if (category === "frame") {
      const w = parseFloat(width) || 0; const h = parseFloat(height) || 0;
      const ws = parseFloat(wSupport) || 0; const hs = parseFloat(hSupport) || 0;
      const q = parseFloat(quantity) || 1; const r = parseFloat(rate) || 0;
      if (w <= 0 || h <= 0) return;
      const calc = calculateFrame(w, ws, h, hs, q, r);
      item = { ...baseItem, width: w, height: h, wSupport: ws, hSupport: hs, totalFit: calc.totalFit, unit: "R.Ft", amount: calc.amount };
    } else {
      const parsedSize = parseSize(size);
      const amt = parseFloat(amount) || (parseFloat(quantity) || 1) * (parseFloat(rate) || 0);
      item = { ...baseItem, width: parsedSize?.width || 0, height: parsedSize?.height || 0, size: size, amount: amt || 0, unit: "" };
    }

    onAddItem(item);
    resetForm();
    if (editingItem) onCancelEdit();
  };

  // Handle Enter on rate field → add item
  const onRateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
  };

  const onNumKeyNext = (e: React.KeyboardEvent<HTMLInputElement>, next: React.RefObject<HTMLInputElement | null> | null) => {
    if (e.key === "Enter" || e.key === "Tab") {
      if (e.key === "Enter") {
        e.preventDefault();
        // Auto-calc print/frame amounts when enter pressed on rate
        if (category === "print" || category === "frame") {
          const w = parseFloat(width) || 0; const h = parseFloat(height) || 0;
          const q = parseFloat(quantity) || 1; const r = parseFloat(rate) || 0;
          if (w > 0 && h > 0 && r > 0) {
            handleAdd();
            return;
          }
        }
        next?.current?.focus();
      }
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  const isTax = invoiceType === "tax";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2" tabIndex={-1}>
        {editingItem ? <><E.Pencil/> Edit Item</> : <><E.Plus/> Add Item</>}
      </h2>

      <div className={`grid gap-4 mb-4 ${isTax ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
        <div>
          <label className={labelClass}>Category</label>
          <select
            ref={categoryRef as any}
            value={category}
            onChange={(e) => onCategoryChange(e.target.value as Category)}
            onKeyDown={onCategoryKeyDown}
            className={inputClass}
            disabled={!!editingItem}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Item / Description</label>
          <select
            ref={descriptionRef}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            onKeyDown={onDescriptionKeyDown}
            className={inputClass}
          >
            {items.map((item) => (<option key={item.name} value={item.name}>{item.name}</option>))}
          </select>
        </div>
        {isTax && (
          <div>
            <label className={labelClass}>HSN Code</label>
            <input type="text" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} placeholder="HSN" className={inputClass} />
          </div>
        )}
      </div>

      {category === "print" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className={labelClass}>Width (ft)</label>
            <input ref={widthRef} type="number" step="0.01" value={width} onChange={(e) => setWidth(e.target.value)} onKeyDown={(e) => onNumKeyNext(e, { current: height as any })} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Height (ft)</label>
            <input type="number" step="0.01" value={height} onChange={(e) => setHeight(e.target.value)} onKeyDown={(e) => onNumKeyNext(e, qtyRef)} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input ref={qtyRef} type="number" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} onKeyDown={(e) => onNumKeyNext(e, rateRef)} placeholder="1" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rate (₹/Sq.Ft)</label>
            <input ref={rateRef} type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} onKeyDown={onRateKeyDown} placeholder="0" className={inputClass} />
          </div>
        </div>
      )}

      {category === "frame" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div>
            <label className={labelClass}>Width (ft)</label>
            <input ref={widthRef} type="number" step="0.01" value={width} onChange={(e) => setWidth(e.target.value)} onKeyDown={(e) => onNumKeyNext(e, { current: wSupport as any })} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>W Support</label>
            <input type="number" step="1" value={wSupport} onChange={(e) => setWSupport(e.target.value)} onKeyDown={(e) => onNumKeyNext(e, { current: height as any })} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Height (ft)</label>
            <input type="number" step="0.01" value={height} onChange={(e) => setHeight(e.target.value)} onKeyDown={(e) => onNumKeyNext(e, { current: hSupport as any })} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>H Support</label>
            <input type="number" step="1" value={hSupport} onChange={(e) => setHSupport(e.target.value)} onKeyDown={(e) => onNumKeyNext(e, qtyRef)} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input ref={qtyRef} type="number" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} onKeyDown={(e) => onNumKeyNext(e, rateRef)} placeholder="1" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rate (₹/R.Ft)</label>
            <input ref={rateRef} type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} onKeyDown={onRateKeyDown} placeholder="0" className={inputClass} />
          </div>
        </div>
      )}

      {category === "other" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className={labelClass}>Size (WxH)</label>
            <input ref={sizeRef} type="text" value={size} onChange={(e) => setSize(e.target.value)} onKeyDown={(e) => onNumKeyNext(e, qtyRef)} placeholder="3x5" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input ref={qtyRef} type="number" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} onKeyDown={(e) => onNumKeyNext(e, rateRef)} placeholder="1" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rate (₹)</label>
            <input ref={rateRef} type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} onKeyDown={onRateKeyDown} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Amount (₹)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={onRateKeyDown} placeholder="0" className={inputClass} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button ref={addBtnRef} onClick={handleAdd} disabled={!description}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2">
          {editingItem ? <><E.Check/> Update Item</> : <>+ Add Item</>}
        </button>
        {editingItem && (
          <button onClick={() => { onCancelEdit(); resetForm(); }}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-all">Cancel</button>
        )}
        <button onClick={resetForm} className="px-4 py-2.5 text-gray-500 rounded-lg text-sm hover:bg-gray-100 transition-all">Clear</button>
      </div>

      <div className="mt-3 text-xs text-gray-400 flex items-start gap-1.5">
        {category === "print" && <><E.Bulb/> Enter Width → Height → Qty → Rate, press Enter to add.</>}
        {category === "frame" && <><E.Bulb/> Fill all fields, press Enter on Rate to add item.</>}
        {category === "other" && <><E.Bulb/> Fill fields, Enter on Rate/Amount adds the item.</>}
      </div>
    </div>
  );
}
