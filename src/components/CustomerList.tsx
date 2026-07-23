"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, INDIAN_STATES } from "@/lib/constants";
import { E } from "@/components/emojis";

interface Customer {
  id: number;
  customerCode: string | null;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  creditLimit: number;
  creditDays: number;
  openingBalance: number;
  totalBusiness: number;
  totalPaid: number;
  balance: number;
  autoReminder: boolean;
  notes: string | null;
  createdAt: string;
}

interface CustomerListProps {
  showToast: (message: string, type?: string) => void;
  onViewStatement: (customerId: number) => void;
}

const emptyForm = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  state: "Maharashtra",
  pincode: "",
  gstNumber: "",
  panNumber: "",
  creditLimit: 0,
  creditDays: 30,
  openingBalance: 0,
  autoReminder: true,
  notes: "",
};

export default function CustomerList({ showToast, onViewStatement }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const url = search ? `/api/customers?search=${encodeURIComponent(search)}` : "/api/customers";
      const res = await fetch(url);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timeout);
  }, [fetchCustomers]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast("Customer name is required", "error");
      return;
    }

    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.duplicate) {
          setDuplicateWarning(`Customer "${data.duplicate.name}" already has this phone number.`);
          return;
        }
        showToast(data.error || "Failed to save customer", "error");
        return;
      }

      showToast(editingCustomer ? "Customer updated!" : "Customer added!");
      setShowModal(false);
      setEditingCustomer(null);
      setFormData({ ...emptyForm });
      setDuplicateWarning(null);
      fetchCustomers();
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to save customer", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this customer?")) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Customer deleted!");
        fetchCustomers();
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to delete", "error");
    }
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone || "",
      whatsapp: c.whatsapp || "",
      email: c.email || "",
      address: c.address || "",
      city: c.city || "",
      state: c.state || "Maharashtra",
      pincode: c.pincode || "",
      gstNumber: c.gstNumber || "",
      panNumber: c.panNumber || "",
      creditLimit: c.creditLimit || 0,
      creditDays: c.creditDays || 30,
      openingBalance: c.openingBalance || 0,
      autoReminder: c.autoReminder !== false,
      notes: c.notes || "",
    });
    setDuplicateWarning(null);
    setShowModal(true);
  };

  const totalBusiness = customers.reduce((sum, c) => sum + (c.totalBusiness || 0), 0);
  const totalBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const inp = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white";
  const lbl = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <div className="text-3xl mb-1"><E.Users/></div>
          <div className="text-2xl font-bold">{customers.length}</div>
          <div className="text-sm text-white/80">Total Customers</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
          <div className="text-3xl mb-1"><E.Money/></div>
          <div className="text-2xl font-bold">{formatCurrency(totalBusiness)}</div>
          <div className="text-sm text-white/80">Total Business</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <div className="text-3xl mb-1"><E.Hourglass/></div>
          <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
          <div className="text-sm text-white/80">Total Outstanding</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><E.Search/></span>
        </div>
        <button onClick={() => { setEditingCustomer(null); setFormData({ ...emptyForm }); setDuplicateWarning(null); setShowModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700">
          + Add Customer
        </button>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="text-4xl animate-pulse"><E.Users/></div></div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center"><div className="text-4xl mb-3"><E.User/></div><p className="text-gray-400">No customers found</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {customers.map((c) => {
              const overLimit = c.creditLimit > 0 && c.balance > c.creditLimit;
              return (
                <div key={c.id} className={`p-4 hover:bg-gray-50 transition-colors ${overLimit ? "border-l-4 border-red-400" : ""}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 flex items-center gap-2">
                          {c.name}
                          {overLimit && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">OVER LIMIT</span>}
                          {c.gstNumber && <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full">GST</span>}
                        </div>
                        <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 mt-0.5">
                          {c.phone && <span><E.Mobile/> {c.phone}</span>}
                          {c.email && <span><E.Mail/> {c.email}</span>}
                          {c.city && <span><E.Pin/> {c.city}</span>}
                        </div>
                        {c.creditLimit > 0 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Limit: {formatCurrency(c.creditLimit)} · {c.creditDays} days
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="text-right"><div className="text-xs text-gray-400">Business</div><div className="font-semibold text-sm">{formatCurrency(c.totalBusiness || 0)}</div></div>
                      <div className="text-right"><div className="text-xs text-gray-400">Balance</div><div className={`font-semibold text-sm ${(c.balance || 0) > 0 ? "text-orange-600" : "text-green-600"}`}>{formatCurrency(c.balance || 0)}</div></div>
                      <div className="flex gap-1">
                        <button onClick={() => onViewStatement(c.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Statement"><E.Chart/></button>
                        <button onClick={() => openEditModal(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><E.Pencil/></button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><E.Trash/></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg flex items-center gap-2">{editingCustomer ? <><E.Pencil/> Edit Customer</> : <><E.User/> Add Customer</>}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl"><E.X/></button>
            </div>

            {duplicateWarning && (
              <div className="mx-5 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                <E.Warn/> {duplicateWarning}
              </div>
            )}

            <div className="p-5 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inp} placeholder="Customer name" />
                </div>
                <div>
                  <label className={lbl}>Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inp} placeholder="Phone number" />
                </div>
                <div>
                  <label className={lbl}>WhatsApp</label>
                  <input type="tel" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} className={inp} placeholder="WhatsApp (same as phone?)" />
                </div>
                <div>
                  <label className={lbl}>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inp} placeholder="Email address" />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={lbl}>Address</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className={inp} placeholder="Full address" />
                </div>
                <div>
                  <label className={lbl}>City</label>
                  <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className={inp} placeholder="City" />
                </div>
                <div>
                  <label className={lbl}>State</label>
                  <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className={inp}>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Pincode</label>
                  <input type="text" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className={inp} placeholder="Pincode" />
                </div>
              </div>

              {/* Tax Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>GSTIN</label>
                  <input type="text" value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })} className={inp} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div>
                  <label className={lbl}>PAN Number</label>
                  <input type="text" value={formData.panNumber} onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })} className={inp} placeholder="AAAAA0000A" />
                </div>
              </div>

              {/* Credit */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 text-sm mb-3"><E.Card/> Credit Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={lbl}>Credit Limit (₹)</label>
                    <input type="number" step="100" min="0" value={formData.creditLimit || ""} onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })} className={inp} placeholder="0" />
                  </div>
                  <div>
                    <label className={lbl}>Credit Days</label>
                    <input type="number" min="0" value={formData.creditDays || ""} onChange={(e) => setFormData({ ...formData, creditDays: parseInt(e.target.value) || 30 })} className={inp} placeholder="30" />
                  </div>
                  <div>
                    <label className={lbl}>Opening Balance (₹)</label>
                    <input type="number" step="0.01" value={formData.openingBalance || ""} onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })} className={inp} placeholder="0" disabled={!!editingCustomer} />
                  </div>
                </div>
              </div>

              {/* Reminder */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.autoReminder} onChange={(e) => setFormData({ ...formData, autoReminder: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Enable auto payment reminder</span>
              </label>

              {/* Notes */}
              <div>
                <label className={lbl}>Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={`${inp} h-20 resize-none`} placeholder="Any additional notes" />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700">{editingCustomer ? "Update" : "Add"} Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}