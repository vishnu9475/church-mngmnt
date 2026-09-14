import { useMemo } from "react";
import { Search } from "lucide-react";
import Monthly_Receipts from "./MonthlyReceipts";
import PaginationControls from "../../../components/common/PaginationControls";

function All_Receipts({ receipts, receiptOptions, onAddReceipt, onEditReceipt, onDeleteReceipt, search, onSearchChange, selectedYear, onYearChange, selectedPayer, onPayerChange, page, pageSize, totalCount, onPageChange, isLoading = false, error = "" }) {
  const years = useMemo(() => ["All Years", ...Array.from(new Set(receiptOptions.map((receipt) => new Date(receipt.date).getFullYear()).filter(Number.isFinite))).sort((a, b) => b - a)], [receiptOptions]);
  const payers = useMemo(() => ["All Payers", ...Array.from(new Set(receiptOptions.map((receipt) => receipt.payer).filter(Boolean))).sort()], [receiptOptions]);
  const sortedMonths = useMemo(() => Object.entries(receipts.reduce((groups, receipt) => {
    const month = new Date(receipt.date).toLocaleString("default", { month: "long", year: "numeric" });
    (groups[month] ||= []).push(receipt);
    return groups;
  }, {})).sort(([a], [b]) => new Date(b) - new Date(a)), [receipts]);

  return <div className="space-y-6">
    <div className="space-y-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-8 font-semibold text-gray-800">Filters</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div><label className="mb-2 block text-sm font-medium text-gray-700">Filter by Year</label><select value={selectedYear} onChange={(event) => onYearChange(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-[#f5f5f5] px-4 py-3 outline-none">{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>
        <div><label className="mb-2 block text-sm font-medium text-gray-700">Filter by Payer / Family</label><select value={selectedPayer} onChange={(event) => onPayerChange(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-[#f5f5f5] px-4 py-3 outline-none">{payers.map((payer) => <option key={payer} value={payer}>{payer}</option>)}</select></div>
        <div><label className="mb-2 block text-sm font-medium text-gray-700">Search</label><div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-[#f5f5f5] px-4 py-3"><Search className="h-5 w-5 text-gray-400" /><input type="text" placeholder="Search receipts..." value={search} onChange={(event) => onSearchChange(event.target.value)} className="w-full bg-transparent text-sm outline-none" /></div></div>
      </div>
      <button onClick={() => { onYearChange("All Years"); onPayerChange("All Payers"); onSearchChange(""); }} className="mt-5 rounded-xl border border-gray-300 bg-white px-5 py-2 transition hover:bg-gray-50">Clear Filters</button>
    </div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load receipts: {error}</div>}
    {isLoading ? <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center text-gray-500">Loading receipts…</div> : sortedMonths.length > 0 ? sortedMonths.map(([month, monthReceipts]) => <Monthly_Receipts key={month} month={month} receipts={monthReceipts} onEditReceipt={onEditReceipt} onDeleteReceipt={onDeleteReceipt} />) : <div className="rounded-3xl border border-gray-200 bg-white p-16 text-center"><h3 className="font-medium text-gray-500">No receipts found</h3><button onClick={onAddReceipt} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 transition hover:bg-gray-50"><span>+</span>Add your first receipt</button></div>}
    <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={onPageChange} />
  </div>;
}

export default All_Receipts;
