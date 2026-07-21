"use client";

import { useState, useEffect, useCallback } from "react";
import { INDIAN_STATES } from "@/lib/constants";

interface CompanySettings {
  id?: number;
  companyName: string;
  ownerName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  gstNumber: string;
  panNumber: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  logoUrl: string;
  qrCodeUrl: string;
  signatureUrl: string;
  invoicePrefix: string;
  quotationPrefix: string;
  calculationPrefix: string;
  financialYearStart: string;
  currentFinancialYear: string;
  invoiceCounter: number;
  defaultInvoiceType: string;
  gstEnabled: boolean;
  defaultCgstPercent: number;
  defaultSgstPercent: number;
  defaultIgstPercent: number;
  defaultDiscountPercent: number;
  defaultTerms: string;
  invoiceNotes: string;
  invoiceFooter: string;
  currency: string;
  dateFormat: string;
  printSize: string;
  autoBackup: boolean;
  backupFrequency: string;
  enableReminders: boolean;
  reminderDays: number;
}

interface SettingsProps {
  showToast: (message: string, type?: string) => void;
}

export default function Settings({ showToast }: SettingsProps) {
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: "Laxmi Flex Printers",
    ownerName: "",
    address: "",
    city: "Wardha",
    state: "Maharashtra",
    pincode: "",
    phone: "",
    mobile: "",
    email: "",
    website: "",
    gstNumber: "",
    panNumber: "",
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
    logoUrl: "",
    qrCodeUrl: "",
    signatureUrl: "",
    invoicePrefix: "INV",
    quotationPrefix: "QUO",
    calculationPrefix: "CAL",
    financialYearStart: "04",
    currentFinancialYear: "",
    invoiceCounter: 1,
    defaultInvoiceType: "normal",
    gstEnabled: false,
    defaultCgstPercent: 9,
    defaultSgstPercent: 9,
    defaultIgstPercent: 18,
    defaultDiscountPercent: 0,
    defaultTerms: "",
    invoiceNotes: "",
    invoiceFooter: "Thank you for your business!",
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    printSize: "A5",
    autoBackup: false,
    backupFrequency: "daily",
    enableReminders: true,
    reminderDays: 7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("company");

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/company-settings");
      const data = await res.json();
      if (data && !data.error) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/company-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showToast("Settings saved successfully!");
      } else {
        showToast("Failed to save settings", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  const tabs = [
    { key: "company", label: "🏢 Company", icon: "🏢" },
    { key: "bank", label: "🏦 Bank", icon: "🏦" },
    { key: "invoice", label: "📄 Invoice", icon: "📄" },
    { key: "gst", label: "💰 GST", icon: "💰" },
    { key: "print", label: "🖨️ Print", icon: "🖨️" },
    { key: "backup", label: "💾 Backup", icon: "💾" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-pulse">⚙️</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">⚙️ Enterprise Settings</h2>
          <p className="text-sm text-gray-500">Configure your business settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {saving ? "⏳ Saving..." : "💾 Save All Settings"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Company Tab */}
      {activeTab === "company" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3">🏢 Company Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Company Name *</label>
              <input type="text" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Owner Name</label>
              <input type="text" value={settings.ownerName} onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Address</label>
              <input type="text" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input type="text" value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <select value={settings.state} onChange={(e) => setSettings({ ...settings, state: e.target.value })} className={inputClass}>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Pincode</label>
              <input type="text" value={settings.pincode} onChange={(e) => setSettings({ ...settings, pincode: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mobile</label>
              <input type="tel" value={settings.mobile} onChange={(e) => setSettings({ ...settings, mobile: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input type="url" value={settings.website} onChange={(e) => setSettings({ ...settings, website: e.target.value })} className={inputClass} placeholder="https://" />
            </div>
            <div>
              <label className={labelClass}>GST Number</label>
              <input type="text" value={settings.gstNumber} onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value.toUpperCase() })} className={inputClass} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div>
              <label className={labelClass}>PAN Number</label>
              <input type="text" value={settings.panNumber} onChange={(e) => setSettings({ ...settings, panNumber: e.target.value.toUpperCase() })} className={inputClass} placeholder="AAAAA0000A" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h4 className="font-semibold text-gray-700 mb-3">📷 Uploads</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Logo URL</label>
                <input type="url" value={settings.logoUrl} onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })} className={inputClass} placeholder="https://..." />
                {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="mt-2 h-12 object-contain" />}
              </div>
              <div>
                <label className={labelClass}>QR Code URL</label>
                <input type="url" value={settings.qrCodeUrl} onChange={(e) => setSettings({ ...settings, qrCodeUrl: e.target.value })} className={inputClass} placeholder="https://..." />
                {settings.qrCodeUrl && <img src={settings.qrCodeUrl} alt="QR" className="mt-2 h-12 object-contain" />}
              </div>
              <div>
                <label className={labelClass}>Signature URL</label>
                <input type="url" value={settings.signatureUrl} onChange={(e) => setSettings({ ...settings, signatureUrl: e.target.value })} className={inputClass} placeholder="https://..." />
                {settings.signatureUrl && <img src={settings.signatureUrl} alt="Signature" className="mt-2 h-8 object-contain" />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Tab */}
      {activeTab === "bank" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3">🏦 Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bank Name</label>
              <input type="text" value={settings.bankName} onChange={(e) => setSettings({ ...settings, bankName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Branch</label>
              <input type="text" value={settings.bankBranch} onChange={(e) => setSettings({ ...settings, bankBranch: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Account Number</label>
              <input type="text" value={settings.accountNumber} onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>IFSC Code</label>
              <input type="text" value={settings.ifscCode} onChange={(e) => setSettings({ ...settings, ifscCode: e.target.value.toUpperCase() })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>UPI ID</label>
              <input type="text" value={settings.upiId} onChange={(e) => setSettings({ ...settings, upiId: e.target.value })} className={inputClass} placeholder="name@upi" />
            </div>
          </div>
        </div>
      )}

      {/* Invoice Tab */}
      {activeTab === "invoice" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3">📄 Invoice Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Invoice Prefix</label>
              <input type="text" value={settings.invoicePrefix} onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value.toUpperCase() })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Quotation Prefix</label>
              <input type="text" value={settings.quotationPrefix} onChange={(e) => setSettings({ ...settings, quotationPrefix: e.target.value.toUpperCase() })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Calculation Prefix</label>
              <input type="text" value={settings.calculationPrefix} onChange={(e) => setSettings({ ...settings, calculationPrefix: e.target.value.toUpperCase() })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Financial Year Start (Month)</label>
              <select value={settings.financialYearStart} onChange={(e) => setSettings({ ...settings, financialYearStart: e.target.value })} className={inputClass}>
                <option value="01">January</option>
                <option value="04">April (Indian FY)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Invoice Counter</label>
              <input type="number" value={settings.invoiceCounter} onChange={(e) => setSettings({ ...settings, invoiceCounter: parseInt(e.target.value) || 1 })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Default Invoice Type</label>
              <select value={settings.defaultInvoiceType} onChange={(e) => setSettings({ ...settings, defaultInvoiceType: e.target.value })} className={inputClass}>
                <option value="normal">Normal Invoice</option>
                <option value="tax">Tax Invoice (GST)</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Default Terms & Conditions</label>
            <textarea value={settings.defaultTerms} onChange={(e) => setSettings({ ...settings, defaultTerms: e.target.value })} className={`${inputClass} h-24 resize-none`} placeholder="Enter default terms..." />
          </div>
          <div>
            <label className={labelClass}>Invoice Footer</label>
            <input type="text" value={settings.invoiceFooter} onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })} className={inputClass} />
          </div>
        </div>
      )}

      {/* GST Tab */}
      {activeTab === "gst" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3">💰 GST Settings</h3>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.gstEnabled}
                onChange={(e) => setSettings({ ...settings, gstEnabled: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-gray-700">Enable GST</span>
            </label>
            <span className="text-sm text-gray-500">When enabled, tax invoices will show CGST/SGST/IGST</span>
          </div>
          
          {settings.gstEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Default CGST %</label>
                <input type="number" step="0.5" value={settings.defaultCgstPercent} onChange={(e) => setSettings({ ...settings, defaultCgstPercent: parseFloat(e.target.value) || 0 })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Default SGST %</label>
                <input type="number" step="0.5" value={settings.defaultSgstPercent} onChange={(e) => setSettings({ ...settings, defaultSgstPercent: parseFloat(e.target.value) || 0 })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Default IGST %</label>
                <input type="number" step="0.5" value={settings.defaultIgstPercent} onChange={(e) => setSettings({ ...settings, defaultIgstPercent: parseFloat(e.target.value) || 0 })} className={inputClass} />
              </div>
            </div>
          )}
          
          <div>
            <label className={labelClass}>Default Discount %</label>
            <input type="number" step="0.5" value={settings.defaultDiscountPercent} onChange={(e) => setSettings({ ...settings, defaultDiscountPercent: parseFloat(e.target.value) || 0 })} className={inputClass} style={{ maxWidth: "200px" }} />
          </div>
        </div>
      )}

      {/* Print Tab */}
      {activeTab === "print" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3">🖨️ Print Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Default Print Size</label>
              <select value={settings.printSize} onChange={(e) => setSettings({ ...settings, printSize: e.target.value })} className={inputClass}>
                <option value="A5">A5 (148 × 210 mm)</option>
                <option value="A4">A4 (210 × 297 mm)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className={inputClass}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date Format</label>
              <select value={settings.dateFormat} onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })} className={inputClass}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Backup Tab */}
      {activeTab === "backup" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3">💾 Backup & Reminders</h3>
          
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoBackup}
                onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-gray-700">Enable Auto Backup</span>
            </label>
          </div>
          
          {settings.autoBackup && (
            <div>
              <label className={labelClass}>Backup Frequency</label>
              <select value={settings.backupFrequency} onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })} className={inputClass} style={{ maxWidth: "200px" }}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableReminders}
                  onChange={(e) => setSettings({ ...settings, enableReminders: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-700">Enable Payment Reminders</span>
              </label>
            </div>
            
            {settings.enableReminders && (
              <div className="mt-4">
                <label className={labelClass}>Reminder Days (before due)</label>
                <input type="number" value={settings.reminderDays} onChange={(e) => setSettings({ ...settings, reminderDays: parseInt(e.target.value) || 7 })} className={inputClass} style={{ maxWidth: "150px" }} />
              </div>
            )}
          </div>

          {/* Backup Action Section */}
          <div className="pt-6 mt-6 border-t border-gray-100">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🛡️ Database Safety</h4>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-emerald-900 font-bold">Manual Data Export</p>
                <p className="text-emerald-700 text-xs">Download a full backup of all your records. Keep this file safe on your personal computer or Google Drive.</p>
              </div>
              <button 
                onClick={() => { window.location.href = "/api/backup"; }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
              >
                📥 Download Backup (.json)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-center text-white">
        <div className="text-4xl mb-2">🖨️</div>
        <h3 className="font-bold text-xl">{settings.companyName}</h3>
        <p className="text-blue-200 text-sm">{settings.city}, {settings.state}</p>
        <p className="text-xs text-blue-300 mt-2">Enterprise Billing System v2.0</p>
      </div>
    </div>
  );
}