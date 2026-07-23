"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { E } from "@/components/emojis";

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

  // Check existing session on mount (with retry for cold-start flakiness)
  useEffect(() => {
    let cancelled = false;
    const check = async (attempt = 0) => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) { setAuthUser(data); setAuthLoading(false); return; }
        }
        // If 5xx / network error, retry once (Vercel cold start can cause 1st request to fail)
        if ((res.status >= 500 || res.status === 0) && attempt < 2) {
          setTimeout(() => check(attempt + 1), 800);
          return;
        }
      } catch {
        if (!cancelled && attempt < 2) { setTimeout(() => check(attempt + 1), 800); return; }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = (user: AuthUser) => { setAuthUser(user); };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    setCurrentPage("dashboard");
    if (typeof window !== "undefined") window.history.replaceState(null, "", "#dashboard");
  };

  const hasPermission = (perm: string) => authUser?.role === "admin" || (authUser?.permissions || []).includes(perm);

  // Valid page keys (renderable in the main switch). Keep in sync with the JSX below.
  const VALID_PAGES = new Set([
    "dashboard", "editor", "history", "rates", "payments", "customers",
    "search", "statement", "accounts", "reports", "trash", "settings",
  ]);

  // Current page is persisted via URL hash so reload / back-button land on the
  // same page the user was looking at. Default: dashboard.
  const readPageFromHash = (): string => {
    if (typeof window === "undefined") return "dashboard";
    const h = (window.location.hash || "").replace(/^#/, "");
    return VALID_PAGES.has(h) ? h : "dashboard";
  };
  const [currentPage, setCurrentPage] = useState<string>(() => readPageFromHash());

  // Sync state → URL hash (silent replace so we don't spam history on each nav)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = `#${currentPage}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [currentPage]);

  // Listen for browser back/forward and update state accordingly.
  useEffect(() => {
    const onHashChange = () => setCurrentPage(readPageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

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

  // Summary — now discount is in rupees; advance has cash+account split
  const [discountRupees, setDiscountRupees] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [advanceCash, setAdvanceCash] = useState(0);
  const [advanceAccount, setAdvanceAccount] = useState(0);

  // Focus refs
  const invoiceTypeRef = useRef<HTMLSelectElement | null>(null);
  const categoryRef = useRef<HTMLSelectElement | null>(null);
  const customerNameRef = useRef<HTMLInputElement | null>(null);

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
  const discountAmount = discountRupees || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const isTax = invoiceType === "tax";
  const companyState = company?.state || "Maharashtra";
  const isSameState = !customerGst || customerGst.length < 2 || !company?.gstNumber
    || customerGst.substring(0, 2) === company.gstNumber.substring(0, 2);
  const gstCalc = isTax
    ? calculateGST(taxableAmount, gstPercent, isSameState)
    : { cgstPercent: 0, cgstAmount: 0, sgstPercent: 0, sgstAmount: 0, igstPercent: 0, igstAmount: 0, totalGst: 0 };

  const gstAmount = isTax ? gstCalc.totalGst : 0;
  const grandTotal = Number((taxableAmount + gstAmount + (isTax ? roundOff : 0)).toFixed(2));
  const totalAdvance = (advanceCash || 0) + (advanceAccount || 0);
  const balanceAmount = Math.max(0, Number((grandTotal - totalAdvance).toFixed(2)));
  const paidAmount = totalAdvance;

  // ========= LOAD COMPANY SETTINGS =========
  const loadCompany = useCallback(async () => {
    try {
      const res = await fetch("/api/company-settings", { cache: "no-store" });
      if (res.status === 401) { setAuthUser(null); setAuthLoading(false); return; }
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
        const draft = { invoiceNumber, invoiceType, invoiceDate, customerName, customerPhone, customerAddress, customerGst, notes, items, discountRupees, gstPercent, roundOff, advanceCash, advanceAccount, documentType };
        localStorage.setItem("lfp_draft", JSON.stringify(draft));
      } catch { /* ignore quota errors */ }
    }, 30000);
    return () => clearTimeout(timer);
  }, [items, currentPage, invoiceNumber, invoiceType, invoiceDate, customerName, customerPhone, customerAddress, customerGst, notes, discountRupees, gstPercent, roundOff, advanceCash, advanceAccount, documentType]);

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
    // Only call /api/seed when unauthenticated (fresh install). If logged in and
    // rates are empty, tables must already exist — just set seeded=true so UI
    // doesn't keep retrying seed (which now requires admin auth on non-fresh DBs).
    if (authUser) {
      setSeeded(true);
      return;
    }
    try {
      await fetch("/api/seed", { method: "POST" });
      setSeeded(true);
      await loadRates();
    } catch (error) {
      console.error("Failed to seed:", error);
    }
  }, [loadRates, authUser]);

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
    setDiscountRupees(0);
    setGstPercent(0);
    setRoundOff(0);
    setAdvanceCash(0);
    setAdvanceAccount(0);
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
      customerGst: isTax ? customerGst : "",
      items: items.map((i) => ({
        ...i,
        hsnCode: isTax ? (i.hsnCode || "") : undefined,
      })),
      subtotal,
      discountPercent: 0,
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
      roundOff: isTax ? roundOff : 0,
      grandTotal,
      notes,
      status: "saved",
      // advance/payment split
      advanceCash: advanceCash || 0,
      advanceAccount: advanceAccount || 0,
    };

    try {
      if (currentEstimateId) {
        const res = await fetch(`/api/estimates/${currentEstimateId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || "Failed to update", "error"); return; }
        showToast("Updated!");
      } else {
        const res = await fetch("/api/estimates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || "Failed to save", "error"); return; }
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

  const handlePreview = () => {
    if (items.length === 0) { showToast("Add items to preview.", "error"); return; }
    // Preview opens the existing print HTML in a new tab (no print dialog auto-fire)
    import("@/lib/invoiceTemplate").then(({ generateInvoiceHTML }) => {
      const html = generateInvoiceHTML(buildInvoiceTemplateData(false));
      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); }
    });
  };

  const handlePrintAction = () => handlePrintInvoice();

  // Shared data builder for print/pdf/preview
  const buildInvoiceTemplateData = (withDialog = true) => ({
    invoiceNumber, invoiceType: invoiceType as "normal"|"tax", invoiceDate,
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
    customer: { name: customerName, address: customerAddress, phone: customerPhone,
      gstNumber: isTax && customerGst ? customerGst : undefined, state: companyState },
    items, subtotal, discountPercent: 0, discountAmount, taxableAmount,
    cgstPercent: gstCalc.cgstPercent, cgstAmount: gstCalc.cgstAmount,
    sgstPercent: gstCalc.sgstPercent, sgstAmount: gstCalc.sgstAmount,
    igstPercent: gstCalc.igstPercent, igstAmount: gstCalc.igstAmount,
    roundOff: isTax ? roundOff : 0, grandTotal,
    amountInWords: numberToWords(grandTotal),
    paidAmount: totalAdvance, balanceAmount, notes,
    termsConditions: company?.defaultTerms || "",
  });

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
      // Legacy invoices may store discountPercent; prefer discountAmount (rupees).
      setDiscountRupees(data.discountAmount || 0);
      setGstPercent(data.gstPercent || 0);
      setRoundOff(data.roundOff || 0);
      // Reset advance payments — they're re-enterable from the Summary block.
      setAdvanceCash(0);
      setAdvanceAccount(0);
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
      setEditingItem(null);
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
    // For printing, we honor the tax/normal rule: GST only on tax invoices.
    const data = { ...buildInvoiceTemplateData(true) };
    if (!isTax) {
      data.cgstPercent = 0; data.cgstAmount = 0;
      data.sgstPercent = 0; data.sgstAmount = 0;
      data.igstPercent = 0; data.igstAmount = 0;
      data.roundOff = 0;
      data.customer.gstNumber = undefined;
    }
    printInvoice(data);
  };

  // ========= PDF (uses same HTML template as Print for consistency) =========
  const handleExportPdf = async () => {
    if (items.length === 0) { showToast("Add items first.", "error"); return; }
    const { generateInvoiceHTML } = await import("@/lib/invoiceTemplate");
    const data = { ...buildInvoiceTemplateData(true) };
    if (!isTax) {
      data.cgstPercent = 0; data.cgstAmount = 0;
      data.sgstPercent = 0; data.sgstAmount = 0;
      data.igstPercent = 0; data.igstAmount = 0;
      data.roundOff = 0;
      data.customer.gstNumber = undefined;
    }
    const html = generateInvoiceHTML(data);
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
    showToast("PDF ready for save/print!");
  };

  const handleViewStatement = (customerId: number) => { setStatementCustomerId(customerId); setCurrentPage("statement"); };

  const getDocTypeLabel = () => documentType === "invoice" ? "Invoice" : documentType === "quotation" ? "Quotation" : "Calculator";
  const getDocTypeIcon = () => documentType === "invoice" ? <E.Doc/> : documentType === "quotation" ? <E.Clipboard/> : <E.Calc/>;

  // ========= RESTORE DRAFT =========
  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem("lfp_draft");
      if (!raw) { showToast("No draft found.", "info"); return; }
      const d = JSON.parse(raw);
      setItems(Array.isArray(d.items) ? d.items : []);
      if (d.invoiceNumber) setInvoiceNumber(d.invoiceNumber);
      if (d.invoiceType) setInvoiceType(d.invoiceType);
      if (d.invoiceDate) setInvoiceDate(d.invoiceDate);
      if (d.customerName) setCustomerName(d.customerName);
      if (d.customerPhone) setCustomerPhone(d.customerPhone);
      if (d.customerAddress) setCustomerAddress(d.customerAddress);
      if (d.customerGst) setCustomerGst(d.customerGst);
      if (d.notes) setNotes(d.notes);
      // Support both legacy (discountPercent) and new (discountRupees) drafts
      if (typeof d.discountRupees === "number") setDiscountRupees(d.discountRupees);
      else if (typeof d.discountPercent === "number" && d.discountPercent > 0) setDiscountRupees(0);
      if (typeof d.gstPercent === "number") setGstPercent(d.gstPercent);
      if (typeof d.roundOff === "number") setRoundOff(d.roundOff);
      setAdvanceCash(typeof d.advanceCash === "number" ? d.advanceCash : 0);
      setAdvanceAccount(typeof d.advanceAccount === "number" ? d.advanceAccount : 0);
      if (d.documentType) setDocumentType(d.documentType);
      setCurrentEstimateId(null);
      setEditingItem(null);
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
        <div className="text-center"><div className="text-4xl mb-3 animate-bounce"><E.Printer/></div><p className="text-gray-400">Loading...</p></div>
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
            {/* Header badge (small — main action buttons moved into SummarySection) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                <span className="text-lg">{getDocTypeIcon()}</span>
                <span className="font-semibold text-gray-700 text-sm">{getDocTypeLabel()}</span>
                {invoiceType === "tax" && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">GST</span>}
              </div>
              {!currentEstimateId && items.length === 0 && (
                <button onClick={handleRestoreDraft} className="px-3 py-2 bg-white border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 shadow-sm" title="Restore auto-saved draft"><E.Clipboard/> Draft</button>
              )}
              {documentType !== "invoice" && items.length > 0 && (
                <button onClick={async () => { if (!currentEstimateId) await handleSave(); if (currentEstimateId) handleConvertToInvoice(currentEstimateId); }} className="px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 shadow-sm"><E.Doc/> To Invoice</button>
              )}
              <div className="ml-auto flex items-center gap-2">
                {currentEstimateId && <span className="text-xs text-gray-400">#{invoiceNumber}</span>}
              </div>
            </div>

            {/* Customer Details - Hide for Calculator */}
            {documentType !== "calculation" ? (
              <CustomerDetails
                invoiceNumber={invoiceNumber}
                invoiceType={invoiceType}
                invoiceDate={invoiceDate}
                customerName={customerName}
                customerPhone={customerPhone}
                customerAddress={customerAddress}
                customerGst={customerGst}
                notes={notes}
                onInvoiceTypeChange={(t) => {
                  setInvoiceType(t);
                  if (t !== "tax") {
                    setGstPercent(0);
                    setRoundOff(0);
                  } else if (company) {
                    const defaultGst = (company.defaultCgstPercent || 9) + (company.defaultSgstPercent || 9);
                    if (defaultGst > 0 && !gstPercent) setGstPercent(defaultGst);
                  }
                }}
                onInvoiceDateChange={setInvoiceDate}
                onCustomerNameChange={setCustomerName}
                onCustomerPhoneChange={setCustomerPhone}
                onCustomerAddressChange={setCustomerAddress}
                onCustomerGstChange={setCustomerGst}
                onNotesChange={setNotes}
                onCustomerSelect={() => {
                  // After picking a customer from autocomplete, jump to category
                  setTimeout(() => categoryRef.current?.focus(), 50);
                }}
                invoiceTypeRef={invoiceTypeRef}
                customerNameRef={customerNameRef}
              />
            ) : (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-3">
                  <span className="text-4xl"><E.Calc/></span>
                  <div><h2 className="text-xl font-bold">Quick Calculator</h2><p className="text-sm text-white/80">Calculate costs. Convert to invoice later.</p></div>
                </div>
              </div>
            )}

            <CategoryForm
              onAddItem={handleAddItem}
              rates={rates}
              editingItem={editingItem}
              onCancelEdit={() => setEditingItem(null)}
              invoiceType={invoiceType}
              categoryRef={categoryRef}
            />
            <ItemsList items={items} onEdit={setEditingItem} onDelete={handleDeleteItem} onDuplicate={handleDuplicateItem} />

            {items.length > 0 && (
              <SummarySection
                invoiceType={invoiceType}
                subtotal={subtotal}
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
                paidAmount={totalAdvance}
                balanceAmount={balanceAmount}
                onDiscountChange={setDiscountRupees}
                onGstPercentChange={setGstPercent}
                onRoundOffChange={setRoundOff}
                onAdvanceChange={(c, a) => { setAdvanceCash(c); setAdvanceAccount(a); }}
                onAction={(action) => {
                  switch (action) {
                    case "new": handleNewEstimate(); break;
                    case "save": handleSave(); break;
                    case "preview": handlePreview(); break;
                    case "print": handlePrintAction(); break;
                    case "pdf": handleExportPdf(); break;
                    case "clear": handleClearAll(); break;
                  }
                }}
                canSave={items.length > 0}
                isEditing={!!currentEstimateId}
              />
            )}
          </>
        )}

        {/* History */}
        {currentPage === "history" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              {([
                { k: "all", label: <><E.Books/> All</>, active: true },
                { k: "invoice", label: <><E.Doc/> Invoices</>, active: false },
                { k: "quotation", label: <><E.Clipboard/> Quotations</>, active: false },
                { k: "calculation", label: <><E.Calc/> Calculations</>, active: false },
              ]).map((b) => (
                <button key={b.k} onClick={() => loadEstimates(b.k === "all" ? undefined : b.k as DocumentType)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-1.5 ${b.active ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>
                  {b.label}
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
          <div className="text-center py-12"><div className="text-4xl mb-3"><E.Lock/></div><p className="text-gray-500">You don&apos;t have permission to access Settings.</p></div>
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