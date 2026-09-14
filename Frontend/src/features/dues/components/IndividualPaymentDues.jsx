import { useState } from "react";
import { FiCheck, FiDollarSign, FiEdit2, FiX } from "react-icons/fi";
import {
  apiRequest,
  getCategories,
  getMonthlyCollectionRows,
  getPaymentMethods,
  getPendingDuesForFamily,
  initializeData,
} from "../../../data/dataService";

const currency = (value) => `₹${Number(value || 0).toFixed(2)}`;
const today = new Date().toISOString().slice(0, 10);
const displayMonth = (month) => new Date(`${String(month).slice(0, 7)}-01T00:00:00`).toLocaleString("en-IN", { month: "short", year: "numeric" });

function IndividualPaymentDues({
  familyId,
  familyName,
  monthlyDue = 0,
  monthlyPaid = 0,
  closeModal,
  onPaid,
}) {
  // This linked Due mirrors the month-by-month Monthly Collection tracker.
  // Showing it here would offer the same balance twice in one payment form.
  const pendingDues = getPendingDuesForFamily(familyId).filter((due) => (
    due.remaining > 0
    && !String(due.description || "").includes("[monthly-tracker-due]")
    && !String(due.description || "").includes("[monthly-opening-due]")
    && !["Previous Monthly Dues Pending", "Previous Monthly Payment Dues"].includes(String(due.title || ""))
  ));
  const paymentMethods = getPaymentMethods();
  const monthlyCategory = getCategories("Receipt").find((category) => category.category_name === "Monthly Collection");
  const [monthlyRange, setMonthlyRange] = useState({ from: "", to: "" });
  const hasCompleteMonthlyRange = Boolean(monthlyRange.from && monthlyRange.to && monthlyRange.from <= monthlyRange.to);
  const selectedMonthlyRows = hasCompleteMonthlyRange
    ? getMonthlyCollectionRows(familyId, monthlyRange.from.slice(0, 7), monthlyRange.to.slice(0, 7))
    : [];
  const selectedMonthlyPending = selectedMonthlyRows.reduce((sum, row) => sum + Number(row.pending || 0), 0);
  const selectedMonthlyPaidMonths = selectedMonthlyRows.filter((row) => row.pending <= 0).length;
  const selectedMonthlyPaidLabels = selectedMonthlyRows.filter((row) => row.pending <= 0).map((row) => displayMonth(row.month));
  // Before a period is chosen keep the checkbox available when the family has
  // any monthly balance; after choosing dates use only that exact period.
  const monthlyPending = hasCompleteMonthlyRange
    ? selectedMonthlyPending
    : Math.max(Number(monthlyDue) - Number(monthlyPaid), 0);

  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [selectedDues, setSelectedDues] = useState({ monthlyCollection: false });
  const [dueAmounts, setDueAmounts] = useState({});
  const [editingDueId, setEditingDueId] = useState(null);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payError, setPayError] = useState("");
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const selectedOtherDues = pendingDues.filter((due) => selectedDues[due.id]);
  const allSelected =
    (monthlyPending === 0 || selectedDues.monthlyCollection) &&
    pendingDues.length > 0 &&
    pendingDues.every((due) => selectedDues[due.id]);

  const totalAmount =
    (selectedDues.monthlyCollection ? monthlyPending : 0) +
    selectedOtherDues.reduce((sum, due) => sum + Number(dueAmounts[due.id] ?? due.remaining), 0);

  const setDueSelected = (dueId, checked) => {
    setSelectedDues((previous) => ({ ...previous, [dueId]: checked }));
    setDueAmounts((previous) => previous[dueId] === undefined ? { ...previous, [dueId]: pendingDues.find((due) => due.id === dueId)?.remaining || 0 } : previous);
    setErrors((previous) => ({ ...previous, selection: undefined }));
  };

  const handleSelectAll = () => {
    const nextValue = !allSelected;
    const nextSelection = { monthlyCollection: monthlyPending > 0 ? nextValue : false };
    pendingDues.forEach((due) => { nextSelection[due.id] = nextValue; });
    setSelectedDues(nextSelection);
    setDueAmounts((previous) => {
      const nextAmounts = { ...previous };
      pendingDues.forEach((due) => { if (nextAmounts[due.id] === undefined) nextAmounts[due.id] = due.remaining; });
      return nextAmounts;
    });
    setErrors((previous) => ({ ...previous, selection: undefined }));
  };

  const openDueEditor = (due) => {
    setEditingDueId(due.id);
    setPayAmountInput(String(dueAmounts[due.id] ?? due.remaining));
    setPayError("");
  };

  const applyDuePayment = (due) => {
    const amount = Number(payAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Enter a valid amount greater than ₹0.");
      return;
    }
    if (amount > due.remaining) {
      setPayError(`Amount can't exceed the pending balance of ${currency(due.remaining)}.`);
      return;
    }
    setDueAmounts((previous) => ({ ...previous, [due.id]: amount }));
    setSelectedDues((previous) => ({ ...previous, [due.id]: true }));
    setEditingDueId(null);
    setPayAmountInput("");
    setPayError("");
  };

  const validateBeforeProcessing = () => {
    const nextErrors = {};
    if (!paymentDate) nextErrors.paymentDate = "Payment date is required.";
    if (!paymentMethodId) nextErrors.paymentMethod = "Select a payment method.";
    if (!selectedDues.monthlyCollection && selectedOtherDues.length === 0) nextErrors.selection = "Select at least one due to pay.";
    if (selectedDues.monthlyCollection && (!monthlyRange.from || !monthlyRange.to)) {
      nextErrors.monthlyRange = "From and To dates are required for the monthly collection.";
    } else if (selectedDues.monthlyCollection && monthlyRange.from > monthlyRange.to) {
      nextErrors.monthlyRange = "To Date must be on or after From Date.";
    }
    if (selectedDues.monthlyCollection && !monthlyCategory) {
      nextErrors.monthlyRange = "Monthly Collection category is not configured.";
    }
    if (selectedDues.monthlyCollection && hasCompleteMonthlyRange && selectedMonthlyPending <= 0) {
      nextErrors.monthlyRange = "Every selected month is already fully paid. Choose another pending month.";
    }
    selectedOtherDues.forEach((due) => {
      const amount = Number(dueAmounts[due.id] ?? due.remaining);
      if (!Number.isFinite(amount) || amount <= 0 || amount > due.remaining) {
        nextErrors[`due-${due.id}`] = `Enter an amount between ₹0.01 and ${currency(due.remaining)}.`;
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const processPayment = async () => {
    if (!validateBeforeProcessing()) return;
    setIsSaving(true);
    setSaveError("");
    try {
      const requests = [];
      if (selectedDues.monthlyCollection) {
        requests.push(apiRequest("receipts/", {
          method: "POST",
          body: JSON.stringify({
            family: familyId,
            title: "Monthly Collection",
            primary_category: monthlyCategory.category_id,
            amount: selectedMonthlyPending,
            receipt_date: paymentDate,
            payment_method: Number(paymentMethodId),
            description: `[Monthly collection period: ${monthlyRange.from.slice(0, 7)} to ${monthlyRange.to.slice(0, 7)}; monthly amount: ${selectedMonthlyPending.toFixed(2)}]`,
          }),
        }));
      }
      selectedOtherDues.forEach((due) => requests.push(apiRequest("due-payments/", {
        method: "POST",
        body: JSON.stringify({
          due: due.id,
          amount: Number(dueAmounts[due.id] ?? due.remaining),
          payment_date: paymentDate,
          payment_method: Number(paymentMethodId),
          description: `Payment for ${due.title}`,
        }),
      })));
      await Promise.all(requests);
      await initializeData();
      onPaid?.();
      closeModal();
    } catch (error) {
      setSaveError(`Could not process payment: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-[512px] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between">
          <h2 className="min-w-0 pr-3 text-[17px] font-bold text-gray-800">Make Payment - {familyName}</h2>
          <button onClick={closeModal} className="shrink-0 text-gray-400 transition hover:text-gray-600" aria-label="Close payment dialog"><FiX size={20} /></button>
        </div>

        {saveError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{saveError}</p>}

        <div className="mt-5">
          <label className="text-[14px] font-semibold text-gray-700">Payment Date <span className="text-black">*</span></label>
          <input type="date" value={paymentDate} onChange={(event) => { setPaymentDate(event.target.value); setErrors((previous) => ({ ...previous, paymentDate: undefined })); }} className={`mt-2 h-[44px] w-full rounded-xl border bg-white px-3 text-[14px] outline-none focus:border-gray-400 ${errors.paymentDate ? "border-red-400" : "border-gray-300"}`} />
          {errors.paymentDate && <p className="mt-1 text-[12px] font-medium text-red-500">{errors.paymentDate}</p>}
        </div>

        <div className="mt-4">
          <label className="text-[14px] font-semibold text-gray-700">Payment Method <span className="text-black">*</span></label>
          <select value={paymentMethodId} onChange={(event) => { setPaymentMethodId(event.target.value); setErrors((previous) => ({ ...previous, paymentMethod: undefined })); }} className={`mt-2 h-[44px] w-full rounded-xl border px-3 text-[14px] outline-none focus:border-gray-400 ${paymentMethodId ? "bg-white text-gray-800" : "bg-[#e4e4e4] text-gray-500"} ${errors.paymentMethod ? "border-red-400" : "border-gray-300"}`}>
            <option value="">Select payment method</option>
            {paymentMethods.map((method) => <option key={method.payment_method_id} value={method.payment_method_id}>{method.method_name}</option>)}
          </select>
          {errors.paymentMethod && <p className="mt-1 text-[12px] font-medium text-red-500">{errors.paymentMethod}</p>}
        </div>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <input type="checkbox" checked={Boolean(selectedDues.monthlyCollection)} disabled={monthlyPending <= 0} onChange={(event) => { setSelectedDues((previous) => ({ ...previous, monthlyCollection: event.target.checked })); setErrors((previous) => ({ ...previous, selection: undefined })); }} className="mt-1 h-4 w-4 rounded border-gray-300" />
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold text-blue-700">Monthly Collection</h3>
              <p className="mt-1 text-[14px] text-blue-600">{hasCompleteMonthlyRange ? `Amount for selected pending months: ${currency(selectedMonthlyPending)}` : `Monthly dues pending: ${currency(monthlyPending)}`}</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-[13px] font-medium text-gray-700">From Date</label><input type="date" value={monthlyRange.from} onChange={(event) => { setMonthlyRange((previous) => ({ ...previous, from: event.target.value })); setErrors((previous) => ({ ...previous, monthlyRange: undefined })); }} className={`h-[42px] w-full rounded-lg border bg-white px-3 text-[14px] outline-none focus:border-blue-400 ${errors.monthlyRange ? "border-red-400" : "border-gray-300"}`} /></div>
                <div><label className="mb-1 block text-[13px] font-medium text-gray-700">To Date</label><input type="date" min={monthlyRange.from || undefined} value={monthlyRange.to} onChange={(event) => { setMonthlyRange((previous) => ({ ...previous, to: event.target.value })); setErrors((previous) => ({ ...previous, monthlyRange: undefined })); }} className={`h-[42px] w-full rounded-lg border bg-white px-3 text-[14px] outline-none focus:border-blue-400 ${errors.monthlyRange ? "border-red-400" : "border-gray-300"}`} /></div>
              </div>
              {hasCompleteMonthlyRange && selectedMonthlyPaidMonths > 0 && <p className="mt-2 text-[12px] font-medium text-amber-700">Already paid and excluded: {selectedMonthlyPaidLabels.join(", ")}.</p>}
              {errors.monthlyRange && <p className="mt-2 text-[12px] font-medium text-red-500">{errors.monthlyRange}</p>}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-[14px] font-semibold text-gray-700">Other Pending Dues</h3><button onClick={handleSelectAll} disabled={pendingDues.length === 0} className="self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto">{allSelected ? "Unselect All" : "Select All"}</button></div>
          {pendingDues.length === 0 ? <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">No other pending dues for this family.</p> : pendingDues.map((due) => {
            const pending = due.remaining;
            const chosenAmount = Number(dueAmounts[due.id] ?? pending);
            return <div key={due.id} className="mt-4 rounded-xl border border-gray-200 bg-white p-4"><div className="flex items-start gap-3"><input type="checkbox" checked={Boolean(selectedDues[due.id])} onChange={(event) => setDueSelected(due.id, event.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300" /><div className="min-w-0 flex-1"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><h4 className="break-words text-[15px] font-semibold leading-5 text-gray-800">{due.title}</h4><div className="flex items-start justify-between gap-3 sm:justify-end"><div className="text-left text-[13px] leading-5 sm:text-right"><p className="text-gray-500">Due: {currency(due.totalAmount)} | Paid: {currency(due.paid)}</p><p className="font-semibold text-red-500">Pending: {currency(pending)}</p>{selectedDues[due.id] && chosenAmount !== pending && <p className="font-medium text-blue-600">Pay now: {currency(chosenAmount)}</p>}</div><button onClick={() => openDueEditor(due)} className="mt-0.5 shrink-0 text-gray-500 transition hover:text-blue-600" title="Change payment amount"><FiEdit2 size={16} /></button></div></div>{editingDueId === due.id && <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3"><label className="mb-1 block text-[13px] font-medium text-gray-700">Amount to pay now (Pending: {currency(pending)})</label><div className="flex items-center gap-2"><input type="number" min="0.01" step="0.01" max={pending} autoFocus value={payAmountInput} onChange={(event) => { setPayAmountInput(event.target.value); setPayError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyDuePayment(due); } if (event.key === "Escape") setEditingDueId(null); }} className="h-[38px] w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-[14px] outline-none focus:border-blue-400" /><button onClick={() => applyDuePayment(due)} className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700"><FiCheck size={16} /></button><button onClick={() => { setEditingDueId(null); setPayError(""); }} className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-100"><FiX size={16} /></button></div>{payError && <p className="mt-1 text-[12px] font-medium text-red-500">{payError}</p>}</div>}{errors[`due-${due.id}`] && <p className="mt-2 text-[12px] font-medium text-red-500">{errors[`due-${due.id}`]}</p>}</div></div></div>;
          })}
          {errors.selection && <p className="mt-2 text-[12px] font-medium text-red-500">{errors.selection}</p>}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"><span className="text-[14px] font-semibold text-gray-700">Total Payable</span><span className="text-[16px] font-bold text-gray-800">{currency(totalAmount)}</span></div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"><button onClick={processPayment} disabled={isSaving || (monthlyPending <= 0 && pendingDues.length === 0)} className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-gray-500 px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-300"><FiDollarSign size={16} />{isSaving ? "Processing..." : `Process Payment${totalAmount > 0 ? ` (${currency(totalAmount)})` : ""}`}</button><button onClick={closeModal} disabled={isSaving} className="w-full rounded-xl border border-gray-300 bg-white px-5 py-3 text-[14px] font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto">Cancel</button></div>
      </div>
    </div>
  );
}

export default IndividualPaymentDues;
