"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import CategoryForm from "@/components/CategoryForm";
import ItemsList from "@/components/ItemsList";
import SummarySection from "@/components/SummarySection";
import CustomerDetails from "@/components/CustomerDetails";
import RateMaster from "@/components/RateMaster";
import EstimateHistory from "@/components/EstimateHistory";
import Payments from "@/components/Payments";
import CustomerList from "@/components/CustomerList";
import Search from "@/components/Search";
import Statement from "@/components/Statement";
import Trash from "@/components/Trash";
import Settings from "@/components/Settings";
import Accounts from "@/components/Accounts";
import Reports from "@/components/Reports";
import Login from "@/components/Login";
import {
  LineItem,
  generateInvoiceNumber,
  DocumentType,
  formatCurrency,
  calculateGST,
  numberToWords,
} from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";

interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: string;
  permissions: string[];
}

interface RateRecord {
  id: number;
  category: string;
  itemName: string;
  defaultRate: number;
  unit: string;
  hsnCode?: string;
}

interface EstimateRecord {
  id: number;
  invoiceNumber: string;
  type: string;
  customerName: string | null;
  customerPhone: string | null;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

interface CompanyInfo {
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
  defaultTerms: string;
  invoiceFooter: string;
  gstEnabled: boolean;
  defaultCgstPercent: number;
  defaultSgstPercent: number;
  defaultInvoiceType: string;
}

export default function Home() {
  // ========= AUTHENTICATION =========
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data && data.id) setAuthUser(data); })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogin = (user: AuthUser) => { setAuthUser(user); };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    setCurrentPage("dashboard");
  };

  const hasPermission = (perm: string) => authUser?.role === "admin" || (authUser?.permissions || []).includes(perm);

  const [currentPage, setCurrentPage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("invoice");

  // Company settings
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  // Rate Master
  const [rates, setRates] = useState<RateRecord[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Estimate State
  const [items, setItems] = useState<LineItem[]>([]);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [currentEstimateId, setCurrentEstimateId] = useState<number | null>(null);

  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber("invoice"));
  const [invoiceType, setInvoiceType] = useState("normal");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [notes, setNotes] = useState("");

  // Summary
  const [discountPercent, setDiscountPercent] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  // History
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statementCustomerId, setStatementCustomerId] = useState<number | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const showToast = (message: string, type: string = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ========= CALCULATIONS =========
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;

  const isTax = invoiceType === "tax";
  // Auto-determine: if customer's GSTIN starts with a state code different from company state → IGST
  const companyState = company?.state || "Maharashtra";
  const isSameState = !customerGst || customerGst.length < 2 || !company?.gstNumber || customerGst.substring(0, 2) === company.gstNumber.substring(0, 2);
  const gstCalc = isTax
    ? calculateGST(taxableAmount, gstPercent, isSameState)
    : { cgstPercent: 0, cgstAmount: 0, sgstPercent: 0, sgstAmount: 0, igstPercent: 0, igstAmount: 0, totalGst: 0 };

  const gstAmount = isTax ? gstCalc.totalGst : (taxableAmount * gstPercent) / 100;
  const grandTotal = taxableAmount + gstAmount + roundOff;
  const balanceAmount = grandTotal - paidAmount;

  // ========= LOAD COMPANY SETTINGS =========
  const loadCompany = useCallback(async () => {
    try {
      const res = await fetch("/api/company-settings");
      const data = await res.json();
      if (data && !data.error) setCompany(data);
    } catch (e) {
      console.error("Failed to load company settings:", e);
    }
  }, []);

  useEffect(() => { if (authUser) loadCompany(); }, [authUser, loadCompany]);

  // ========= AUTO GST FROM SETTINGS =========
  useEffect(() => {
    if (company && invoiceType === "tax" && gstPercent === 0) {
      const defaultGst = (company.defaultCgstPercent || 9) + (company.defaultSgstPercent || 9);
      if (defaultGst > 0) setGstPercent(defaultGst);
    }
  }, [company, invoiceType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========= AUTO-SAVE DRAFT (every 30s when items exist) =========
  useEffect(() => {
    if (items.length === 0 || currentPage !== "editor") return;
    const timer = setTimeout(() => {
      try {
        const draft = { invoiceNumber, invoiceType, invoiceDate, customerName, customerPhone, customerAddress, customerGst, notes, items, discountPercent, gstPercent, roundOff, documentType };
        localStorage.setItem("lfp_draft", JSON.stringify(draft));
      } catch { /* ignore quota errors */ }
    }, 30000);
    return () => clearTimeout(timer);
  }, [items, currentPage, invoiceNumber, invoiceType, invoiceDate, customerName, customerPhone, customerAddress, customerGst, notes, discountPercent, gstPercent, roundOff, documentType]);

  // ========= RESTORE DRAFT ON MOUNT =========
  useEffect(() => {
    try {
      const draft = localStorage.getItem("lfp_draft");
      if (draft) {
        const d = JSON.parse(draft);
        if (d.items && d.items.length > 0) {
          // Draft exists but don't auto-restore — just flag it
          console.log("Draft available:", d.invoiceNumber);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ========= LOAD RATES =========
  const loadRates = useCallback(async () => {
    try {
      const res = await fetch("/api/rate-master");
      const data = await res.json();
      if (Array.isArray(data)) setRates(data);
    } catch (error) {
      console.error("Failed to load rates:", error);
    }
  }, []);

  const seedRates = useCallback(async () => {
    try {
      await fetch("/api/seed", { method: "POST" });
      setSeeded(true);
      await loadRates();
    } catch (error) {
      console.error("Failed to seed:", error);
    }
  }, [loadRates]);

  useEffect(() => { if (authUser) loadRates(); }, [authUser, loadRates]);
  useEffect(() => { if (authUser && rates.length === 0 && !seeded) seedRates(); }, [authUser, rates.length, seeded, seedRates]);

  // ========= LOAD ESTIMATES =========
  const loadEstimates = useCallback(async (type?: DocumentType) => {
    setHistoryLoading(true);
    try {
      const url = type ? `/api/estimates?type=${type}` : "/api/estimates";
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setEstimates(data);
    } catch (error) {
      console.error("Failed to load estimates:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser && currentPage === "history") loadEstimates();
  }, [authUser, currentPage, loadEstimates]);

  // ========= NAVIGATE =========
  const handleNavigate = (page: string, data?: Record<string, unknown>) => {
    if (page === "loadInvoice" && data?.id) {
      handleLoadEstimate(data.id as number);
      return;
    }
    if (page === "invoice" || page === "quotation" || page === "calculate") {
      const docType = page === "calculate" ? "calculation" : page;
      setDocumentType(docType as DocumentType);
      setCurrentPage("editor");
      handleNewEstimate(docType as DocumentType);
    } else if (page === "expenses") {
      setCurrentPage("accounts");
    } else {
      setCurrentPage(page);
    }
  };

  // ========= ITEM OPERATIONS =========
  const handleAddItem = (item: LineItem) => {
    if (editingItem) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...item, srNo: i.srNo } : i)));
      setEditingItem(null);
    } else {
      setItems((prev) => [...prev, { ...item, srNo: prev.length + 1 }]);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id).map((item, idx) => ({ ...item, srNo: idx + 1 })));
  };

  const handleDuplicateItem = (item: LineItem) => {
    setItems((prev) => [...prev, { ...item, id: uuidv4(), srNo: prev.length + 1 }]);
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    if (confirm("Clear all items?")) { setItems([]); showToast("All items cleared!", "info"); }
  };

  // ========= NEW ESTIMATE =========
  const handleNewEstimate = (type?: DocumentType) => {
    const docType = type || documentType;
    setDocumentType(docType);
    setItems([]);
    setCurrentEstimateId(null);
    setInvoiceNumber(generateInvoiceNumber(docType));
    setInvoiceType(company?.defaultInvoiceType || "normal");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCustomerGst("");
    setNotes("");
    setDiscountPercent(0);
    setGstPercent(0);
    setRoundOff(0);
    setPaidAmount(0);
    setEditingItem(null);
  };

  // ========= SAVE =========
  const handleSave = async () => {
    if (items.length === 0) { showToast("Add at least one item.", "error"); return; }

    const payload = {
      invoiceNumber,
      type: documentType,
      invoiceType,
      invoiceDate,
      customerName,
      customerPhone,
      customerAddress,
      customerGst,
      items,
      subtotal,
      discountPercent,
      discountAmount,
      taxableAmount,
      cgstPercent: gstCalc.cgstPercent,
      cgstAmount: gstCalc.cgstAmount,
      sgstPercent: gstCalc.sgstPercent,
      sgstAmount: gstCalc.sgstAmount,
      igstPercent: gstCalc.igstPercent,
      igstAmount: gstCalc.igstAmount,
      gstPercent,
      gstAmount,
      roundOff,
      grandTotal,
      notes,
      status: "saved",
    };

    try {
      if (currentEstimateId) {
        await fetch(`/api/estimates/${currentEstimateId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        showToast("Updated!");
      } else {
        const res = await fetch("/api/estimates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        setCurrentEstimateId(data.id);
        setInvoiceNumber(data.invoiceNumber || invoiceNumber);
        showToast("Saved!");
      }
      clearDraft();
    } catch (error) {
      console.error("Save error:", error);
      showToast("Failed to save.", "error");
    }
  };

  // ========= LOAD ESTIMATE =========
  const handleLoadEstimate = async (id: number) => {
    try {
      const res = await fetch(`/api/estimates/${id}`);
      const data = await res.json();
      setCurrentEstimateId(data.id);
      setDocumentType(data.type || "invoice");
      setInvoiceType(data.invoiceType || "normal");
      setInvoiceNumber(data.invoiceNumber);
      setInvoiceDate(data.invoiceDate || new Date().toISOString().split("T")[0]);
      setCustomerName(data.customerName || "");
      setCustomerPhone(data.customerPhone || "");
      setCustomerAddress(data.customerAddress || "");
      setCustomerGst(data.customerGst || "");
      setNotes(data.notes || "");
      setDiscountPercent(data.discountPercent || 0);
      setGstPercent(data.gstPercent || 0);
      setRoundOff(data.roundOff || 0);
      setPaidAmount(data.paidAmount || 0);
      const loadedItems: LineItem[] = (data.items || []).map(
        (item: Record<string, unknown>, idx: number) => ({
          id: uuidv4(), srNo: idx + 1,
          category: item.category, description: item.description,
          hsnCode: item.hsnCode || "",
          width: item.width || 0, wSupport: item.wSupport || 0,
          height: item.height || 0, hSupport: item.hSupport || 0,
          quantity: item.quantity || 1, totalFit: item.totalFit || 0,
          unit: item.unit || "", rate: item.rate || 0, amount: item.amount || 0,
          size: item.size || "",
        })
      );
      setItems(loadedItems);
      setCurrentPage("editor");
      showToast("Loaded!");
    } catch (error) {
      console.error("Load error:", error);
      showToast("Failed to load.", "error");
    }
  };

  // ========= DELETE / CONVERT =========
  const handleDeleteEstimate = async (id: number) => {
    try {
      await fetch(`/api/estimates/${id}`, { method: "DELETE" });
      setEstimates((prev) => prev.filter((e) => e.id !== id));
      if (currentEstimateId === id) handleNewEstimate();
      showToast("Moved to trash!");
    } catch (error) { console.error(error); showToast("Failed.", "error"); }
  };

  const handleConvertToInvoice = async (id: number) => {
    try {
      const res = await fetch(`/api/estimates/${id}/convert`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { showToast(`Converted: ${data.invoiceNumber}`); loadEstimates(documentType); }
      else showToast("Failed to convert.", "error");
    } catch (error) { console.error(error); showToast("Failed.", "error"); }
  };

  // ========= RATE UPDATE =========
  const handleRateUpdate = async (id: number, newRate: number) => {
    try {
      await fetch("/api/rate-master", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, defaultRate: newRate }) });
      setRates((prev) => prev.map((r) => (r.id === id ? { ...r, defaultRate: newRate } : r)));
      showToast("Rate updated!");
    } catch (error) { console.error(error); showToast("Failed.", "error"); }
  };

  // ========= PRINT INVOICE (HTML Template) =========
  const handlePrintInvoice = async () => {
    if (items.length === 0) { showToast("Add items first.", "error"); return; }
    const { printInvoice } = await import("@/lib/invoiceTemplate");
    printInvoice({
      invoiceNumber,
      invoiceType: invoiceType as "normal" | "tax",
      invoiceDate,
      company: {
        name: company?.companyName || "Laxmi Flex Printers",
        address: company?.address || "",
        city: company?.city || "Wardha",
        state: company?.state || "Maharashtra",
        pincode: company?.pincode || "",
        phone: company?.phone || "",
        mobile: company?.mobile || "",
        email: company?.email || "",
        website: company?.website || "",
        gstNumber: company?.gstNumber || "",
        panNumber: company?.panNumber || "",
        bankName: company?.bankName || "",
        bankBranch: company?.bankBranch || "",
        accountNumber: company?.accountNumber || "",
        ifscCode: company?.ifscCode || "",
        upiId: company?.upiId || "",
        logoUrl: company?.logoUrl || "",
        qrCodeUrl: company?.qrCodeUrl || "",
        signatureUrl: company?.signatureUrl || "",
      },
      customer: {
        name: customerName,
        address: customerAddress,
        phone: customerPhone,
        gstNumber: customerGst || undefined,
        state: company?.state || "Maharashtra",
      },
      items,
      subtotal,
      discountPercent,
      discountAmount,
      taxableAmount,
      cgstPercent: gstCalc.cgstPercent,
      cgstAmount: gstCalc.cgstAmount,
      sgstPercent: gstCalc.sgstPercent,
      sgstAmount: gstCalc.sgstAmount,
      igstPercent: gstCalc.igstPercent,
      igstAmount: gstCalc.igstAmount,
      roundOff,
      grandTotal,
      amountInWords: numberToWords(grandTotal),
      paidAmount,
      balanceAmount,
      notes,
      termsConditions: company?.defaultTerms || "",
    });
  };

  // ========= PDF (uses same HTML template as Print for consistency) =========
  const handleExportPdf = async () => {
    if (items.length === 0) { showToast("Add items first.", "error"); return; }
    const { generateInvoiceHTML } = await import("@/lib/invoiceTemplate");
    const html = generateInvoiceHTML({
      invoiceNumber,
      invoiceType: invoiceType as "normal" | "tax",
      invoiceDate,
      company: {
        name: company?.companyName || "Laxmi Flex Printers",
        address: company?.address || "", city: company?.city || "Wardha",
        state: company?.state || "Maharashtra", pincode: company?.pincode || "",
        phone: company?.phone || "", mobile: company?.mobile || "",
        email: company?.email || "", website: company?.website || "",
        gstNumber: company?.gstNumber || "", panNumber: company?.panNumber || "",
        bankName: company?.bankName || "", bankBranch: company?.bankBranch || "",
        accountNumber: company?.accountNumber || "", ifscCode: company?.ifscCode || "",
        upiId: company?.upiId || "", logoUrl: company?.logoUrl || "",
        qrCodeUrl: company?.qrCodeUrl || "", signatureUrl: company?.signatureUrl || "",
      },
      customer: { name: customerName, address: customerAddress, phone: customerPhone, gstNumber: customerGst || undefined, state: companyState },
      items, subtotal, discountPercent, discountAmount, taxableAmount,
      cgstPercent: gstCalc.cgstPercent, cgstAmount: gstCalc.cgstAmount,
      sgstPercent: gstCalc.sgstPercent, sgstAmount: gstCalc.sgstAmount,
      igstPercent: gstCalc.igstPercent, igstAmount: gstCalc.igstAmount,
      roundOff, grandTotal, amountInWords: numberToWords(grandTotal),
      paidAmount, balanceAmount, notes, termsConditions: company?.defaultTerms || "",
    });
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
    showToast("PDF ready for save/print!");
  };

  const handleViewStatement = (customerId: number) => { setStatementCustomerId(customerId); setCurrentPage("statement"); };

  const getDocTypeLabel = () => documentType === "invoice" ? "Invoice" : documentType === "quotation" ? "Quotation" : "Calculator";
  const getDocTypeIcon = () => documentType === "invoice" ? "📄" : documentType === "quotation" ? "📋" : "🧮";

  // ========= RESTORE DRAFT =========
  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem("lfp_draft");
      if (!raw) { showToast("No draft found.", "info"); return; }
      const d = JSON.parse(raw);
      if (d.items) setItems(d.items);
      if (d.invoiceNumber) setInvoiceNumber(d.invoiceNumber);
      if (d.invoiceType) setInvoiceType(d.invoiceType);
      if (d.invoiceDate) setInvoiceDate(d.invoiceDate);
      if (d.customerName) setCustomerName(d.customerName);
      if (d.customerPhone) setCustomerPhone(d.customerPhone);
      if (d.customerAddress) setCustomerAddress(d.customerAddress);
      if (d.customerGst) setCustomerGst(d.customerGst);
      if (d.notes) setNotes(d.notes);
      if (d.discountPercent) setDiscountPercent(d.discountPercent);
      if (d.gstPercent) setGstPercent(d.gstPercent);
      if (d.roundOff) setRoundOff(d.roundOff);
      if (d.documentType) setDocumentType(d.documentType);
      setCurrentPage("editor");
      localStorage.removeItem("lfp_draft");
      showToast("Draft restored!");
    } catch { showToast("Failed to restore draft.", "error"); }
  };

  // ========= CLEAR DRAFT =========
  const clearDraft = () => { localStorage.removeItem("lfp_draft"); };

  // ========= AUTH GATE =========
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center"><div className="text-4xl mb-3 animate-bounce">🖨️</div><p className="text-gray-400">Loading...</p></div>
      </div>
    );
  }

  if (!authUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Header currentPage={currentPage} onNavigate={handleNavigate} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} userName={authUser.name} userRole={authUser.role} onLogout={handleLogout} />

      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-[fadeIn_0.3s_ease]">
          <div className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "error" ? "bg-red-500 text-white" : toast.type === "info" ? "bg-gray-700 text-white" : "bg-green-500 text-white"}`}>
            {toast.message}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Dashboard */}
        {currentPage === "dashboard" && <Dashboard onNavigate={handleNavigate} />}

        {/* Editor */}
        {currentPage === "editor" && (
          <>
            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                <span className="text-lg">{getDocTypeIcon()}</span>
                <span className="font-semibold text-gray-700 text-sm">{getDocTypeLabel()}</span>
                {invoiceType === "tax" && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">GST</span>}
              </div>
              <button onClick={() => handleNewEstimate()} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm">📄 New</button>
              <button onClick={handleSave} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">💾 Save</button>
              <button onClick={handlePrintInvoice} className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 shadow-sm">🖨️ Print A5</button>
              <button onClick={handleExportPdf} className="px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 shadow-sm">📄 PDF</button>
              <button onClick={handleClearAll} className="px-3 py-2 bg-white border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 shadow-sm">🗑️ Clear</button>
              {!currentEstimateId && items.length === 0 && (
                <button onClick={handleRestoreDraft} className="px-3 py-2 bg-white border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 shadow-sm" title="Restore auto-saved draft">📋 Draft</button>
              )}
              {documentType !== "invoice" && items.length > 0 && (
                <button onClick={async () => { if (!currentEstimateId) await handleSave(); if (currentEstimateId) handleConvertToInvoice(currentEstimateId); }} className="px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 shadow-sm">📄 To Invoice</button>
              )}
              <div className="ml-auto flex items-center gap-2">
                {currentEstimateId && <span className="text-xs text-gray-400">#{invoiceNumber}</span>}
                {items.length > 0 && <span className="text-sm font-bold text-blue-700">{formatCurrency(grandTotal)}</span>}
              </div>
            </div>

            {/* Customer Details - Hide for Calculator */}
            {documentType !== "calculation" && (
              <CustomerDetails
                invoiceNumber={invoiceNumber}
                invoiceType={invoiceType}
                invoiceDate={invoiceDate}
                customerName={customerName}
                customerPhone={customerPhone}
                customerAddress={customerAddress}
                customerGst={customerGst}
                notes={notes}
                onInvoiceNumberChange={setInvoiceNumber}
                onInvoiceTypeChange={setInvoiceType}
                onInvoiceDateChange={setInvoiceDate}
                onCustomerNameChange={setCustomerName}
                onCustomerPhoneChange={setCustomerPhone}
                onCustomerAddressChange={setCustomerAddress}
                onCustomerGstChange={setCustomerGst}
                onNotesChange={setNotes}
              />
            )}

            {documentType === "calculation" && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">🧮</span>
                  <div><h2 className="text-xl font-bold">Quick Calculator</h2><p className="text-sm text-white/80">Calculate costs. Convert to invoice later.</p></div>
                </div>
              </div>
            )}

            <CategoryForm onAddItem={handleAddItem} rates={rates} editingItem={editingItem} onCancelEdit={() => setEditingItem(null)} />
            <ItemsList items={items} onEdit={setEditingItem} onDelete={handleDeleteItem} onDuplicate={handleDuplicateItem} />

            {items.length > 0 && (
              <SummarySection
                invoiceType={invoiceType}
                subtotal={subtotal}
                discountPercent={discountPercent}
                discountAmount={discountAmount}
                taxableAmount={taxableAmount}
                cgstPercent={gstCalc.cgstPercent}
                cgstAmount={gstCalc.cgstAmount}
                sgstPercent={gstCalc.sgstPercent}
                sgstAmount={gstCalc.sgstAmount}
                igstPercent={gstCalc.igstPercent}
                igstAmount={gstCalc.igstAmount}
                gstPercent={gstPercent}
                gstAmount={gstAmount}
                roundOff={roundOff}
                grandTotal={grandTotal}
                paidAmount={paidAmount}
                balanceAmount={balanceAmount}
                onDiscountPercentChange={setDiscountPercent}
                onGstPercentChange={setGstPercent}
                onRoundOffChange={setRoundOff}
              />
            )}
          </>
        )}

        {/* History */}
        {currentPage === "history" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {(["all", "invoice", "quotation", "calculation"] as const).map((t) => (
                <button key={t} onClick={() => loadEstimates(t === "all" ? undefined : t as DocumentType)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${t === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>
                  {t === "all" ? "📚 All" : t === "invoice" ? "📄 Invoices" : t === "quotation" ? "📋 Quotations" : "🧮 Calculations"}
                </button>
              ))}
            </div>
            <EstimateHistory estimates={estimates} onLoad={handleLoadEstimate} onDelete={handleDeleteEstimate} onConvert={handleConvertToInvoice} loading={historyLoading} type={documentType} />
          </div>
        )}

        {currentPage === "rates" && <RateMaster rates={rates} onRateUpdate={handleRateUpdate} />}
        {currentPage === "payments" && <Payments showToast={showToast} />}
        {currentPage === "customers" && <CustomerList showToast={showToast} onViewStatement={handleViewStatement} />}
        {currentPage === "search" && <Search onLoadInvoice={handleLoadEstimate} onViewCustomer={handleViewStatement} />}
        {currentPage === "statement" && statementCustomerId && <Statement customerId={statementCustomerId} onBack={() => setCurrentPage("customers")} />}
        {currentPage === "accounts" && <Accounts showToast={showToast} />}
        {currentPage === "reports" && <Reports showToast={showToast} />}
        {currentPage === "trash" && <Trash showToast={showToast} />}
        {currentPage === "settings" && hasPermission("settings.view") && <Settings showToast={showToast} />}
        {currentPage === "settings" && !hasPermission("settings.view") && (
          <div className="text-center py-12"><div className="text-4xl mb-3">🔒</div><p className="text-gray-500">You don&apos;t have permission to access Settings.</p></div>
        )}
      </main>

      <footer className={`border-t ${darkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"} mt-8`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-sm text-gray-400">
          <p><strong>Laxmi Flex Printers</strong> • Wardha • Enterprise Billing System v2.0</p>
        </div>
      </footer>
    </div>
  );
}