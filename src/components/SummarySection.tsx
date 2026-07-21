"use client";

interface SummarySectionProps {
  invoiceType: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  gstPercent: number;
  gstAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  onDiscountPercentChange: (val: number) => void;
  onGstPercentChange: (val: number) => void;
  onRoundOffChange: (val: number) => void;
}

export default function SummarySection({
  invoiceType,
  subtotal,
  discountPercent,
  discountAmount,
  taxableAmount,
  cgstPercent,
  cgstAmount,
  sgstPercent,
  sgstAmount,
  igstPercent,
  igstAmount,
  gstPercent,
  gstAmount,
  roundOff,
  grandTotal,
  paidAmount,
  balanceAmount,
  onDiscountPercentChange,
  onGstPercentChange,
  onRoundOffChange,
}: SummarySectionProps) {
  const inputClass =
    "w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
  const isTax = invoiceType === "tax";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        💵 Summary
        {isTax && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Tax Invoice</span>}
      </h3>

      <div className="space-y-3 max-w-lg ml-auto">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">Subtotal</span>
          <span className="font-semibold text-gray-800">₹{subtotal.toFixed(2)}</span>
        </div>

        {/* Discount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">Discount</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={discountPercent || ""}
              onChange={(e) => onDiscountPercentChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={inputClass}
            />
            <span className="text-gray-400 text-sm">%</span>
          </div>
          <span className="text-red-500 font-medium">
            {discountAmount > 0 ? `- ₹${discountAmount.toFixed(2)}` : "₹0.00"}
          </span>
        </div>

        <div className="border-t border-gray-100" />

        {/* Taxable Amount */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">{isTax ? "Taxable Amount" : "After Discount"}</span>
          <span className="font-medium text-gray-700">₹{taxableAmount.toFixed(2)}</span>
        </div>

        {/* GST Section */}
        {isTax ? (
          <>
            {/* Tax Invoice: CGST + SGST */}
            <div className="bg-yellow-50 rounded-xl p-3 space-y-2 border border-yellow-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">GST Rate</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={gstPercent || ""}
                    onChange={(e) => onGstPercentChange(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className={inputClass}
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
                <span className="text-green-600 font-medium">+ ₹{gstAmount.toFixed(2)}</span>
              </div>
              {gstPercent > 0 && (
                <div className="pt-1 border-t border-yellow-200 space-y-1">
                  {igstPercent > 0 ? (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>IGST @ {igstPercent}%</span>
                      <span>₹{igstAmount.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>CGST @ {cgstPercent}%</span>
                        <span>₹{cgstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>SGST @ {sgstPercent}%</span>
                        <span>₹{sgstAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Normal Invoice: Simple GST */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">GST</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={gstPercent || ""}
                onChange={(e) => onGstPercentChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={inputClass}
              />
              <span className="text-gray-400 text-sm">%</span>
            </div>
            <span className="text-green-600 font-medium">
              {gstAmount > 0 ? `+ ₹${gstAmount.toFixed(2)}` : "₹0.00"}
            </span>
          </div>
        )}

        {/* Round Off */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">Round Off</span>
            <input
              type="number"
              step="0.01"
              value={roundOff || ""}
              onChange={(e) => onRoundOffChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <span className="text-gray-500 font-medium">
            {roundOff !== 0 ? `${roundOff > 0 ? "+" : ""}₹${roundOff.toFixed(2)}` : "₹0.00"}
          </span>
        </div>

        <div className="border-t-2 border-blue-600" />

        {/* Grand Total */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-gray-800">Grand Total</span>
          <span className="text-2xl font-bold text-blue-700">₹{grandTotal.toFixed(2)}</span>
        </div>

        {/* Payment Info */}
        {paidAmount > 0 && (
          <>
            <div className="border-t border-gray-100" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">Received</span>
              <span className="text-green-600 font-semibold">₹{paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-orange-600">Balance Due</span>
              <span className="text-orange-600 font-bold text-lg">₹{balanceAmount.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}