import { useEffect, useState } from "react";
import { getMonthlyCollectionRows, getPaymentMethods, initializeData } from "../../../data/dataService";
import { createDuePayment } from "../../../services/dueService";

const currency = (value) => `₹${Number(value || 0).toFixed(2)}`;
const displayMonth = (month) => new Date(`${String(month).slice(0, 7)}-01T00:00:00`).toLocaleString("en-IN", { month: "short", year: "numeric" });

function FamilyDuePayment({ isOpen, setIsOpen, due, familyId, onPayment }) {
  const paymentMethods = getPaymentMethods();
  const [methodId, setMethodId] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [monthlyRange, setMonthlyRange] = useState({ from: "", to: "" });

  const pendingAmount = Math.max(Number(due?.remaining || 0), 0);
  const isPreviousMonthlyDue = String(due?.description || "").includes("[monthly-tracker-due]")
    || String(due?.description || "").includes("[monthly-opening-due]")
    || ["Previous Monthly Dues Pending", "Previous Monthly Payment Dues"].includes(String(due?.title || ""));
  const hasValidRange = Boolean(monthlyRange.from && monthlyRange.to && monthlyRange.from <= monthlyRange.to);
  const selectedMonthRows = isPreviousMonthlyDue && hasValidRange
    ? getMonthlyCollectionRows(familyId, monthlyRange.from, monthlyRange.to)
    : [];
  const selectedMonthlyPending = selectedMonthRows.reduce((sum, row) => sum + Number(row.pending || 0), 0);
  const settledMonths = selectedMonthRows.filter((row) => row.pending <= 0).length;
  const settledMonthLabels = selectedMonthRows.filter((row) => row.pending <= 0).map((row) => displayMonth(row.month));
  // Payment Amount is the system-calculated pending balance. If Other Amount
  // is entered, it replaces that amount for a partial payment.
  const enteredOtherAmount = Number(otherAmount || 0);
  const maximumPayment = isPreviousMonthlyDue && hasValidRange ? selectedMonthlyPending : pendingAmount;
  const totalPayment = otherAmount === "" ? maximumPayment : enteredOtherAmount;

  // Opening a different due must reset the form rather than carrying the
  // previous family's amount into this payment.
  useEffect(() => {
    if (isOpen) {
      setOtherAmount("");
      setMethodId("");
      setError("");
      setMonthlyRange({ from: "", to: "" });
    }
  }, [isOpen, due?.id]);

  if (!isOpen) return null;

  const handlePayment = async () => {
    if (!Number.isFinite(enteredOtherAmount) || enteredOtherAmount < 0) {
      setError("Other Amount cannot be negative.");
      return;
    }
    if (!methodId) {
      setError("Select a payment method.");
      return;
    }
    if (isPreviousMonthlyDue && !hasValidRange) {
      setError("Select the From and To month for this monthly collection payment.");
      return;
    }
    if (totalPayment <= 0 || totalPayment > maximumPayment) {
      setError(`Payment cannot exceed the selected pending amount of ${currency(maximumPayment)}.`);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await createDuePayment({
          due: due.id,
          amount: totalPayment,
          payment_date: new Date().toISOString().slice(0, 10),
          payment_method: Number(methodId),
          description: isPreviousMonthlyDue
            ? `[Monthly due payment period: ${monthlyRange.from} to ${monthlyRange.to}] ${otherAmount === "" ? "Full selected monthly payment" : `Partial selected monthly payment: ₹${totalPayment.toFixed(2)}`}`
            : otherAmount === "" ? "Full family due payment" : `Partial family due payment: ₹${totalPayment.toFixed(2)}`,
      });
      await initializeData();
      onPayment?.();
      setIsOpen(false);
    } catch (requestError) {
      setError(`Could not record payment: ${requestError.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-4 shadow-lg sm:p-6 md:p-8">
        <button onClick={() => setIsOpen(false)} className="absolute right-4 top-4 text-2xl text-gray-400 hover:text-black" aria-label="Close payment dialog">×</button>
        <h1 className="mb-6 text-2xl font-bold leading-snug sm:mb-7 md:text-[20px]">Record Payment for {due?.title || "Due"}</h1>

        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:mb-7 sm:p-5">
          <div className="mb-4 flex items-center justify-between"><p className="text-sm text-gray-500 sm:text-base">Total Amount:</p><p className="font-semibold text-sm sm:text-base">{currency(due?.totalAmount)}</p></div>
          <div className="flex items-center justify-between border-b border-gray-300 pb-4"><p className="text-sm text-gray-500 sm:text-base">Already Paid:</p><p className="font-semibold text-sm sm:text-base">{currency(due?.paid)}</p></div>
          <div className="flex items-center justify-between pt-4"><p className="text-sm text-gray-500 sm:text-base">Remaining:</p><p className="text-sm font-bold text-red-500 sm:text-base">{currency(pendingAmount)}</p></div>
        </div>

        {isPreviousMonthlyDue && <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-semibold text-blue-900">Monthly collection period</p><p className="mt-1 text-xs text-blue-800">Choose exact months. Paid months are automatically excluded and cannot be charged again.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-gray-700">From month<input type="month" value={monthlyRange.from} max={monthlyRange.to || undefined} onChange={(event) => { setMonthlyRange((value) => ({ ...value, from: event.target.value })); setError(""); }} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2" /></label><label className="text-sm font-medium text-gray-700">To month<input type="month" value={monthlyRange.to} min={monthlyRange.from || undefined} onChange={(event) => { setMonthlyRange((value) => ({ ...value, to: event.target.value })); setError(""); }} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2" /></label></div>{hasValidRange && <p className="mt-3 text-sm font-medium text-blue-900">Selected pending amount: {currency(selectedMonthlyPending)}</p>}{hasValidRange && settledMonths > 0 && <p className="mt-1 text-xs font-medium text-amber-700">Already paid and excluded: {settledMonthLabels.join(", ")}.</p>}</div>}
        <div className="mb-5"><label className="mb-2 block text-sm font-semibold sm:text-base">Payment Amount *</label><input type="number" value={maximumPayment.toFixed(2)} readOnly className="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-200 px-4 py-3 text-sm text-gray-700 outline-none sm:text-base" /><p className="mt-1 text-xs text-gray-500">Automatically calculated from the {isPreviousMonthlyDue ? "selected monthly balance" : "remaining due amount"}.</p></div>
        <div className="mb-5"><label className="mb-2 block text-sm font-semibold sm:text-base">Other Amount <span className="font-normal text-gray-500">(optional, for partial payment)</span></label><input type="number" min="0.01" max={maximumPayment} step="0.01" value={otherAmount} onChange={(event) => { setOtherAmount(event.target.value); setError(""); }} placeholder={`Enter up to ${currency(maximumPayment)}`} className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm outline-none sm:text-base" /><p className="mt-1 text-xs text-gray-500">Amount to record: {currency(totalPayment)} of {currency(maximumPayment)} pending.</p></div>
        <div className="mb-5"><label className="mb-2 block text-sm font-semibold sm:text-base">Payment Method *</label><select value={methodId} onChange={(event) => { setMethodId(event.target.value); setError(""); }} className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm outline-none sm:text-base"><option value="">Select method</option>{paymentMethods.map((method) => <option key={method.payment_method_id} value={method.payment_method_id}>{method.method_name}</option>)}</select></div>
        {error && <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600" role="alert">{error}</p>}
        <div className="flex flex-col gap-4 sm:flex-row"><button onClick={handlePayment} disabled={isSaving || pendingAmount <= 0} className="flex-1 rounded-xl bg-black py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 sm:text-base">{isSaving ? "Recording..." : "Record Payment"}</button><button onClick={() => setIsOpen(false)} disabled={isSaving} className="w-full rounded-xl border border-gray-300 px-8 py-3 text-sm hover:bg-gray-100 sm:w-auto sm:text-base">Cancel</button></div>
      </div>
    </div>
  );
}

export default FamilyDuePayment;
