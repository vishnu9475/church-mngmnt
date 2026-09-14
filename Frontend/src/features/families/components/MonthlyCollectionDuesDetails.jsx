import { useEffect, useMemo, useState } from "react";
import {
  getFamilyById, getFamilyMonthlyDueRates, getFamilyMonthlyPaymentStatuses, getMonthlyCollectionPendingBalance,
  getMonthlyDueAmount, getMonthlyCollectionRows, getReceiptsFormatted, initializeData, syncMonthlyCollectionPendingDue,
} from "../../../data/dataService";
import { saveMonthlyPaymentStatus, setFinancialYearMonthlyRate } from "../../../services/dueService";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const asMonthDate = (value) => new Date(`${value}-01T00:00:00`);
const displayMonth = (value) => asMonthDate(value).toLocaleString("en-IN", { month: "long", year: "numeric" });
const displayAuditDate = (value) => value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not recorded";
const monthRange = (start, end) => {
  const months = [], cursor = asMonthDate(start), last = asMonthDate(end);
  while (cursor <= last) { months.push(monthKey(cursor)); cursor.setMonth(cursor.getMonth() + 1); }
  return months;
};

export default function MonthlyCollectionDuesDetails({ familyId }) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const family = getFamilyById(Number(familyId) || 1);
  const today = new Date();
  const latestMonth = monthKey(today);
  const fiveYearsAgo = monthKey(new Date(today.getFullYear() - 4, today.getMonth(), 1));
  const configuredStart = String(family?.monthly_dues_start_month || "").slice(0, 7);
  const trackerStart = configuredStart && configuredStart > fiveYearsAgo ? configuredStart : fiveYearsAgo;
  const allMonths = useMemo(() => monthRange(trackerStart, latestMonth), [trackerStart, latestMonth]);
  const years = [...new Set(allMonths.map((month) => month.slice(0, 4)))].sort((a, b) => Number(b) - Number(a));
  const [selectedYear, setSelectedYear] = useState(years[0] || String(today.getFullYear()));
  const currentFinancialYearStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const firstFinancialYearStart = (() => { const start = asMonthDate(trackerStart); return start.getFullYear() - (start.getMonth() < 3 ? 1 : 0); })();
  const financialYears = Array.from(
    { length: Math.max(1, currentFinancialYearStart - firstFinancialYearStart + 1) },
    (_, index) => currentFinancialYearStart - index,
  );
  const [financialYearStart, setFinancialYearStart] = useState(String(currentFinancialYearStart));
  const [editorAmount, setEditorAmount] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMonth, setStatusMonth] = useState(latestMonth);
  const [manualStatus, setManualStatus] = useState("Unpaid");
  const [manualPaidAmount, setManualPaidAmount] = useState("0");
  const [statusError, setStatusError] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const monthlyAmount = Number(family?.monthly_collection_amount || 0);

  const manualStatusByMonth = useMemo(() => new Map(
    getFamilyMonthlyPaymentStatuses(family?.family_id).map((entry) => [String(entry.month || "").slice(0, 7), entry])
  ), [family?.family_id, refreshVersion]);

  useEffect(() => {
    const firstMonthInYear = allMonths.find((month) => month.startsWith(selectedYear));
    if (firstMonthInYear) setStatusMonth(firstMonthInYear);
  }, [selectedYear, allMonths]);
  useEffect(() => {
    const refreshFromExternalChange = () => setRefreshVersion((value) => value + 1);
    window.addEventListener("church-data-updated", refreshFromExternalChange);
    return () => window.removeEventListener("church-data-updated", refreshFromExternalChange);
  }, []);
  const financialYearMonths = useMemo(() => {
    const start = Number(financialYearStart);
    return Array.from({ length: 12 }, (_, index) => {
      const monthNumber = 4 + index;
      const year = start + (monthNumber > 12 ? 1 : 0);
      const month = monthNumber > 12 ? monthNumber - 12 : monthNumber;
      return `${year}-${String(month).padStart(2, "0")}`;
    });
  }, [financialYearStart]);
  const financialYearRates = useMemo(() => {
    const rates = new Map(getFamilyMonthlyDueRates(family?.family_id).map((rate) => [String(rate.month || "").slice(0, 7), rate]));
    return financialYearMonths.map((month) => rates.get(month)).filter(Boolean);
  }, [family?.family_id, financialYearMonths, refreshVersion]);
  useEffect(() => {
    const amounts = [...new Set(financialYearRates.map((rate) => Number(rate.amount || 0)))];
    setEditorAmount(String(amounts.length === 1 ? amounts[0] : monthlyAmount));
  }, [financialYearRates, monthlyAmount]);
  useEffect(() => {
    const saved = manualStatusByMonth.get(statusMonth);
    setManualStatus(saved?.status || "Unpaid");
    setManualPaidAmount(String(saved?.paid_amount || 0));
  }, [statusMonth, manualStatusByMonth]);

  const allRows = useMemo(() => getMonthlyCollectionRows(family?.family_id, trackerStart, latestMonth).map((row) => {
    const manual = manualStatusByMonth.get(row.month);
    const receiptNumbers = row.allocations
      .filter((allocation) => allocation.source_type === "receipt")
      .map((allocation) => getReceiptsFormatted().find((receipt) => Number(receipt.id) === Number(allocation.source_id))?.receiptNo)
      .filter(Boolean);
    const hasDuePayment = row.allocations.some((allocation) => allocation.source_type === "due_payment");
    return {
      ...row,
      dueAmount: row.due,
      receiptNumbers: [...new Set(receiptNumbers)],
      status: manual?.status || row.status,
      isManual: Boolean(manual) && row.allocations.length === 0,
      hasDuePayment,
    };
  }), [family?.family_id, trackerStart, latestMonth, manualStatusByMonth, refreshVersion]);
  const rows = allRows.filter((row) => row.month.startsWith(selectedYear));
  const yearDue = rows.reduce((sum, row) => sum + row.dueAmount, 0);
  const yearPaid = rows.reduce((sum, row) => sum + row.paid, 0);
  const yearPending = rows.reduce((sum, row) => sum + row.pending, 0);
  // Both cards deliberately use this exact unified balance: all selected monthly dues up to today.
  const totalPending = getMonthlyCollectionPendingBalance(family?.family_id, trackerStart);
  const editorMonths = allMonths.filter((month) => month.startsWith(selectedYear));
  const existingManualStatus = manualStatusByMonth.get(statusMonth);

  const reload = async () => {
    await initializeData();
    await syncMonthlyCollectionPendingDue(family?.family_id, trackerStart);
    setRefreshVersion((value) => value + 1);
  };
  const saveFinancialYearAmount = async () => {
    const amount = Number(editorAmount);
    if (!Number.isFinite(amount) || amount < 0) return setSaveError("Enter a valid monthly due amount of ₹0 or more.");
    setIsSaving(true); setSaveError("");
    try {
      await setFinancialYearMonthlyRate({ family: family.family_id, financial_year_start: Number(financialYearStart), amount });
      await reload();
    } catch (error) { setSaveError(`Could not save monthly amount: ${error.message}`); } finally { setIsSaving(false); }
  };
  const onManualStatusChange = (status) => {
    setManualStatus(status);
    if (status === "Paid") setManualPaidAmount(String(getMonthlyDueAmount(family?.family_id, statusMonth)));
    if (status === "Unpaid") setManualPaidAmount("0");
  };
  const saveManualStatus = async () => {
    const due = getMonthlyDueAmount(family?.family_id, statusMonth);
    const paidAmount = Number(manualPaidAmount);
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > due) return setStatusError(`Paid amount must be between ₹0.00 and ${money(due)}.`);
    if (manualStatus === "Paid" && paidAmount !== due) return setStatusError("A paid month must use the full monthly due amount.");
    if (manualStatus === "Partial" && (paidAmount <= 0 || paidAmount >= due)) return setStatusError("A partial payment must be greater than ₹0.00 and less than the monthly due.");
    if (manualStatus === "Unpaid" && paidAmount !== 0) return setStatusError("An unpaid month must have ₹0.00 paid.");
    setIsSavingStatus(true); setStatusError("");
    try {
      const payload = { family: family.family_id, month: `${statusMonth}-01`, status: manualStatus, paid_amount: paidAmount, notes: "Manual historical monthly payment reconciliation" };
      await saveMonthlyPaymentStatus(existingManualStatus?.status_id, payload);
      await reload();
    } catch (error) { setStatusError(`Could not save payment status: ${error.message}`); } finally { setIsSavingStatus(false); }
  };
  if (!family) return null;

  return <section className="w-full rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="text-lg font-semibold text-gray-800">Monthly Payment Dues Details</h2><p className="mt-1 text-sm text-gray-500">Five-year tracker for paid, partial, and unpaid monthly collection periods.</p></div><label className="text-sm font-medium text-gray-600">Accounting Year<select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="ml-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none">{years.map((year) => <option key={year}>{year}</option>)}</select></label></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="text-xs text-blue-700">Default monthly collection</p><p className="mt-1 text-lg font-bold text-blue-900">{money(monthlyAmount)}</p></div><div className="rounded-lg border border-amber-100 bg-amber-50 p-3"><p className="text-xs text-amber-700">Previous monthly dues pending</p><p className="mt-1 text-lg font-bold text-amber-900">{money(totalPending)}</p></div><div className="rounded-lg border border-green-100 bg-green-50 p-3"><p className="text-xs text-green-700">Paid in {selectedYear}</p><p className="mt-1 text-lg font-bold text-green-900">{money(yearPaid)}</p></div><div className="rounded-lg border border-red-100 bg-red-50 p-3"><p className="text-xs text-red-700">Total pending through {displayMonth(latestMonth)}</p><p className="mt-1 text-lg font-bold text-red-900">{money(totalPending)}</p></div></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-2"><div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4"><h3 className="text-sm font-semibold text-indigo-950">Set Financial-Year Monthly Due</h3><p className="mt-1 text-xs text-indigo-800">Override the default monthly amount for every month from April through March.</p><div className="mt-3 flex flex-wrap items-end gap-3"><label className="text-xs font-medium text-indigo-900">Financial year<select value={financialYearStart} onChange={(event) => setFinancialYearStart(event.target.value)} className="mt-1 block rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-800">{financialYears.map((year) => <option key={year} value={year}>Apr {year} – Mar {year + 1}</option>)}</select></label><label className="text-xs font-medium text-indigo-900">Monthly due (₹)<input type="number" min="0" step="0.01" value={editorAmount} onChange={(event) => setEditorAmount(event.target.value)} className="mt-1 block w-32 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-800" /></label><button type="button" onClick={saveFinancialYearAmount} disabled={isSaving} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:bg-indigo-300">{isSaving ? "Saving..." : financialYearRates.length ? "Update Financial Year" : "Set Financial Year"}</button></div>{financialYearRates.length > 0 && financialYearRates.length < 12 && <p className="mt-2 text-xs text-indigo-800">Some months already had different rates. Saving will make all 12 months use this amount.</p>}{saveError && <p className="mt-2 text-xs font-medium text-red-600">{saveError}</p>}</div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4"><h3 className="text-sm font-semibold text-emerald-950">Manually Reconcile Monthly Payment</h3><p className="mt-1 text-xs text-emerald-800">For an older payment already made but not entered in this system. Use Receipt Management for a new payment.</p><div className="mt-3 flex flex-wrap items-end gap-3"><label className="text-xs font-medium text-emerald-900">Month<select value={statusMonth} onChange={(event) => setStatusMonth(event.target.value)} className="mt-1 block rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800">{editorMonths.map((month) => <option key={month} value={month}>{displayMonth(month)}</option>)}</select></label><label className="text-xs font-medium text-emerald-900">Status<select value={manualStatus} onChange={(event) => onManualStatusChange(event.target.value)} className="mt-1 block rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800"><option>Paid</option><option>Partial</option><option>Unpaid</option></select></label><label className="text-xs font-medium text-emerald-900">Paid amount (₹)<input type="number" min="0" step="0.01" disabled={manualStatus !== "Partial"} value={manualPaidAmount} onChange={(event) => setManualPaidAmount(event.target.value)} className="mt-1 block w-32 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-100" /></label><button type="button" onClick={saveManualStatus} disabled={isSavingStatus} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-emerald-300">{isSavingStatus ? "Saving..." : existingManualStatus ? "Update Status" : "Save Status"}</button></div>{statusError && <p className="mt-2 text-xs font-medium text-red-600">{statusError}</p>}</div></div>
    <p className="mt-4 text-xs text-gray-500">Tracking starts from {displayMonth(trackerStart)}. Annual due: {money(yearDue)} · Annual pending: {money(yearPending)}.</p>
    <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200"><table className="min-w-[760px] w-full text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-600"><tr><th className="px-4 py-3">Month</th><th className="px-4 py-3 text-right">Monthly Due</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Pending</th><th className="px-4 py-3">Payment Source</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.month} className="border-t border-gray-100"><td className="px-4 py-3 font-medium text-gray-800">{displayMonth(row.month)}</td><td className="px-4 py-3 text-right">{money(row.dueAmount)}</td><td className="px-4 py-3 text-right text-green-700">{money(row.paid)}</td><td className="px-4 py-3 text-right text-red-600">{money(row.pending)}</td><td className="px-4 py-3 text-xs text-gray-600">{row.isManual ? "Manual reconciliation" : row.receiptNumbers.join(", ") || (row.hasDuePayment ? "Previous monthly dues payment" : "—")}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${row.status === "Paid" ? "bg-green-100 text-green-700" : row.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{row.status}</span></td></tr>)}</tbody></table></div>
    {existingManualStatus && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950"><span className="font-semibold">Manual reconciliation audit:</span> {existingManualStatus.audit_count || 1} change{Number(existingManualStatus.audit_count || 1) === 1 ? "" : "s"} · Last change: {displayAuditDate(existingManualStatus.last_changed_at)} · By: {existingManualStatus.last_changed_by || "Unknown user"}</div>}
  </section>;
}
