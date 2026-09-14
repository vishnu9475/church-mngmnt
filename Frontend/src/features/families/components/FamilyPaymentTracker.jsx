import { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import PaidDueStats from "./PaidDueStats";
import PaidDueCard from "./PaidDueCard";
import {
  apiRequest,
  getDuePayments,
  getDues,
  getFamilyPaymentTrackerPage,
  getPaymentMethods,
  getPendingDuesForFamily,
  initializeData,
} from "../../../data/dataService";
import PaginationControls from "../../../components/common/PaginationControls";

const PAGE_SIZE = 10;

const today = new Date().toISOString().slice(0, 10);
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const formatAuditDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

function AuditSummary({ payment }) {
  if (Number(payment?.editCount) <= 0) return null;

  return (
    <section className="mb-5 rounded-lg border border-amber-100 bg-amber-50/70 p-3" aria-label="Payment edit audit">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Payment Edit Audit</p>
      <div className="mt-2 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
        <p><span className="font-medium text-gray-700">Number of edits:</span> {payment.editCount}</p>
        <p><span className="font-medium text-gray-700">Last edit:</span> {formatAuditDateTime(payment.lastEditedAt)}</p>
        <p><span className="font-medium text-gray-700">Previous amount:</span> {money(payment.previousAmount)}</p>
        {payment.previousPaymentMethod && (
          <p><span className="font-medium text-gray-700">Previous payment method:</span> {payment.previousPaymentMethod}</p>
        )}
        <p><span className="font-medium text-gray-700">Edited by:</span> {payment.lastEditedBy || "System"}</p>
      </div>
    </section>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <button type="button" onClick={onClose} className="absolute right-4 top-3 rounded p-1 text-2xl text-gray-400 hover:bg-gray-100 hover:text-black" aria-label={`Close ${title}`}>×</button>
        <h2 className="mb-5 pr-8 text-2xl font-bold text-gray-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function AddPaymentModal({ isOpen, onClose, dues, paymentMethods, onSaved }) {
  const [dueId, setDueId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedDue = dues.find((due) => due.id === Number(dueId));

  useEffect(() => {
    if (!isOpen) return;
    setDueId("");
    setAmount("");
    setPaymentDate(today);
    setPaymentMethodId("");
    setDescription("");
    setError("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const enteredAmount = Number(amount);
    if (!selectedDue) return setError("Select a category / pending due.");
    if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) return setError("Enter an amount greater than ₹0.");
    if (enteredAmount > selectedDue.remaining) return setError(`Amount cannot exceed the pending balance of ${money(selectedDue.remaining)}.`);
    if (!paymentDate || !paymentMethodId) return setError("Payment date and method are required.");

    setIsSaving(true);
    setError("");
    try {
      await apiRequest("due-payments/", {
        method: "POST",
        body: JSON.stringify({
          due: selectedDue.id,
          amount: enteredAmount,
          payment_date: paymentDate,
          payment_method: Number(paymentMethodId),
          description: description.trim() || `Payment for ${selectedDue.title}`,
        }),
      });
      await initializeData();
      onSaved();
      onClose();
    } catch (requestError) {
      setError(`Could not add payment: ${requestError.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell title="Add Payment" onClose={onClose}>
      <div className="space-y-4">
        <label className="block text-sm font-semibold">Category / Pending Due *
          <select value={dueId} onChange={(event) => { const value = event.target.value; const due = dues.find((item) => item.id === Number(value)); setDueId(value); setAmount(due ? String(due.remaining) : ""); setError(""); }} className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none">
            <option value="">Select category</option>
            {dues.map((due) => <option key={due.id} value={due.id}>{due.category} — {due.title} (Pending: {money(due.remaining)})</option>)}
          </select>
        </label>
        {selectedDue && <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">Total: {money(selectedDue.totalAmount)} · Paid: {money(selectedDue.paid)} · Pending: <strong>{money(selectedDue.remaining)}</strong></div>}
        <label className="block text-sm font-semibold">Amount *<input type="number" min="0.01" max={selectedDue?.remaining} step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none" /></label>
        <label className="block text-sm font-semibold">Payment Date *<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none" /></label>
        <label className="block text-sm font-semibold">Payment Method *<select value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none"><option value="">Select method</option>{paymentMethods.map((method) => <option key={method.payment_method_id} value={method.payment_method_id}>{method.method_name}</option>)}</select></label>
        <label className="block text-sm font-semibold">Description<textarea rows="2" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none" placeholder="Additional notes..." /></label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600" role="alert">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row"><button type="button" onClick={handleSave} disabled={isSaving} className="flex-1 rounded-lg bg-black py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-400">{isSaving ? "Saving..." : "Add Payment"}</button><button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-gray-300 px-6 py-3 text-sm hover:bg-gray-100">Cancel</button></div>
      </div>
    </ModalShell>
  );
}

function EditPaymentModal({ payment, due, paymentMethods, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!payment) return;
    setAmount(String(payment.amount));
    setPaymentDate(payment.paymentDate || today);
    setPaymentMethodId(String(payment.paymentMethodId || ""));
    setDescription(payment.description || "");
    setError("");
  }, [payment]);

  if (!payment || !due) return null;
  const maximumAmount = Number(due.remaining_amount ?? due.remaining ?? 0) + Number(payment.amount || 0);

  const handleSave = async () => {
    const enteredAmount = Number(amount);
    if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) return setError("Enter an amount greater than ₹0.");
    if (enteredAmount > maximumAmount) return setError(`Amount cannot exceed ${money(maximumAmount)} for this due.`);
    if (!paymentDate || !paymentMethodId) return setError("Payment date and method are required.");

    setIsSaving(true);
    setError("");
    try {
      await apiRequest(`due-payments/${payment.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ due: payment.dueId, amount: enteredAmount, payment_date: paymentDate, payment_method: Number(paymentMethodId), description: description.trim() }),
      });
      await initializeData();
      onSaved();
      onClose();
    } catch (requestError) {
      setError(`Could not update payment: ${requestError.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell title="Edit Payment" onClose={onClose}>
      <p className="mb-3 text-sm text-gray-500">{due.title} · Maximum allowed: {money(maximumAmount)}</p>
      <AuditSummary payment={payment} />
      <div className="space-y-4">
        <label className="block text-sm font-semibold">Payment Amount *<input type="number" min="0.01" max={maximumAmount} step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none" /></label>
        <label className="block text-sm font-semibold">Payment Date *<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none" /></label>
        <label className="block text-sm font-semibold">Payment Method *<select value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none"><option value="">Select method</option>{paymentMethods.map((method) => <option key={method.payment_method_id} value={method.payment_method_id}>{method.method_name}</option>)}</select></label>
        <label className="block text-sm font-semibold">Description<textarea rows="2" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none" /></label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600" role="alert">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row"><button type="button" onClick={handleSave} disabled={isSaving} className="flex-1 rounded-lg bg-black py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-400">{isSaving ? "Saving..." : "Save Changes"}</button><button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-gray-300 px-6 py-3 text-sm hover:bg-gray-100">Cancel</button></div>
      </div>
    </ModalShell>
  );
}

const FamilyPaymentTracker = ({ familyId }) => {
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [page, setPage] = useState(1);
  const [paymentRows, setPaymentRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [availableYears, setAvailableYears] = useState([String(new Date().getFullYear())]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const familyDues = getDues().filter((due) => due.family_id === Number(familyId));
  const dueById = new Map(familyDues.map((due) => [due.due_id, due]));
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError("");
    getFamilyPaymentTrackerPage(familyId, { page, pageSize: PAGE_SIZE, filters: { year: selectedYear } })
      .then((response) => {
        if (!active) return;
        setPaymentRows(response.results);
        setTotalCount(response.count);
        setSummary(response.meta?.summary || null);
        const years = (response.meta?.summary?.available_years || [new Date().getFullYear()]).map(String);
        setAvailableYears(years);
        if (!years.includes(selectedYear)) setSelectedYear(years[0]);
      })
      .catch((error) => {
        if (!active) return;
        setPaymentRows([]);
        setTotalCount(0);
        setSummary(null);
        setLoadError(error.message || "Could not load payment tracker.");
      })
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [familyId, page, selectedYear, reloadKey]);

  const outstandingDues = getPendingDuesForFamily(familyId).filter((due) => due.remaining > 0);
  const refresh = () => { setPage(1); setReloadKey((version) => version + 1); };
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const handleDeletePayment = async (payment) => {
    if (!window.confirm(`Delete the payment of ${money(payment.amount)} for ${payment.title}?`)) return;
    try {
      await apiRequest(`due-payments/${payment.id}/`, { method: "DELETE" });
      await initializeData();
      refresh();
    } catch (requestError) {
      window.alert(`Could not delete payment: ${requestError.message}`);
    }
  };

  return (
    <div className="w-full rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Payment Tracker - Accounting Year</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedYear} onChange={(event) => { setSelectedYear(event.target.value); setPage(1); }} className="rounded-lg border px-3 py-2 text-sm outline-none">{availableYears.map((year) => <option key={year} value={year}>{year}</option>)}</select>
          <button type="button" onClick={() => setIsAddPaymentOpen(true)} disabled={outstandingDues.length === 0} className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"><FaPlus size={12} />Add Payment</button>
        </div>
      </div>
      <div className="mb-4"><PaidDueStats payments={paymentRows} year={selectedYear} summary={summary} /></div>
      <div className="space-y-4">
        {isLoading ? <p className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Loading payments…</p> : loadError ? <p className="rounded-lg bg-red-50 px-4 py-8 text-center text-sm text-red-600">{loadError}</p> : paymentRows.length === 0 ? <p className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">No recorded due payments for {selectedYear}.</p> : paymentRows.map((payment) => <PaidDueCard key={payment.id} {...payment} onEdit={() => setEditingPayment(payment)} onDelete={() => handleDeletePayment(payment)} />)}
      </div>
      <div className="mt-4"><PaginationControls page={currentPage} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} /></div>
      <AddPaymentModal isOpen={isAddPaymentOpen} onClose={() => setIsAddPaymentOpen(false)} dues={outstandingDues} paymentMethods={getPaymentMethods()} onSaved={refresh} />
      <EditPaymentModal payment={editingPayment} due={editingPayment ? dueById.get(editingPayment.dueId) : null} paymentMethods={getPaymentMethods()} onClose={() => setEditingPayment(null)} onSaved={refresh} />
    </div>
  );
};

export default FamilyPaymentTracker;
