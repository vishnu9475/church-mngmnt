import React from "react";
import { getCashBankSummary, getCreditsDebitsStatement, getSettings } from "../../../data/dataService";

const CreditsDebits = ({ filters }) => {
  // Computed live from settings + receipts + bills via dataService,
  // respecting the date/category filters passed down from ReportFilters.
  const { creditRows, debitRows } = getCreditsDebitsStatement(filters);

  // Transaction totals exclude opening balances. The two financial-position
  // totals below then follow the tally equation exactly.
  const totalCredits = creditRows.filter((r) => r.show && r.sl !== "-").reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalDebits = debitRows.filter((r) => r.show !== false && r.sl !== "-").reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const { cashInHandRaw, bankBalanceRaw } = getCashBankSummary();
  const openingBalances = getSettings();
  const openingCash = filters.includeOpeningCash === false ? 0 : Number(openingBalances.opening_cash || 0);
  const openingBank = filters.includeOpeningBank === false ? 0 : Number(openingBalances.opening_bank || 0);
  const creditGrandTotal = totalCredits + openingCash + openingBank;
  const debitGrandTotal = totalDebits + Number(cashInHandRaw || 0) + Number(bankBalanceRaw || 0);
  const isTally = Math.abs(creditGrandTotal - debitGrandTotal) < 0.01;
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // Opening balances are included in their respective totals, but displayed
  // in the dedicated summary row rather than as transaction rows.
  const visibleCredits = creditRows.filter((r) => r.show && r.sl !== "-");
  const visibleDebits = debitRows.filter((r) => r.show !== false && r.sl !== "-");

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      {/* Title */}
      <h2 className="text-[16px] font-bold text-gray-900 mb-5">Credits &amp; Debits Statement</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">

          {/* ── Column headers ── */}
          <thead>
            <tr className="border-b border-gray-200 bg-gray-100 w-full">
              <th className="text-left text-[13px] font-bold text-gray-700 py-2.5 pr-4 w-14">SL No</th>
              <th className="text-left text-[13px] font-bold text-gray-700 py-2.5 pr-4">Credits Particulars</th>
              <th className="text-right text-[13px] font-bold text-gray-700 py-2.5 pr-8">Amount (₹)</th>
              <th className="text-left text-[13px] font-bold text-gray-700 py-2.5 pr-4 w-14">SL No</th>
              <th className="text-left text-[13px] font-bold text-gray-700 py-2.5 pr-4">Debits Particulars</th>
              <th className="text-right text-[13px] font-bold text-gray-700 py-2.5">Amount (₹)</th>
            </tr>
          </thead>

          <tbody>
            {/* ── Data rows — light blue background ── */}
            {Array.from({ length: Math.max(visibleCredits.length, visibleDebits.length) }).map((_, i) => {
              const cr = visibleCredits[i];
              const dr = visibleDebits[i];
              return (
                <tr key={i} className="bg-blue-50 border-b border-blue-50">
                  {/* Credit side */}
                  <td className="py-2.5 pr-4 text-[13px] font-bold text-gray-500 text-center">{cr ? cr.sl : ""}</td>
                  <td className="py-2.5 pr-4 text-[13px]">
                    {cr && <span className="text-blue-500 font-bold">{cr.particular}</span>}
                  </td>
                  <td className="py-2.5 pr-8 text-right text-[13px]">
                    {cr && <span className="text-blue-500 font-bold">{fmt(cr.amount)}</span>}
                  </td>
                  {/* Debit side */}
                  <td className="py-2.5 pr-4 text-[13px] font-bold text-gray-500 text-center">{dr ? dr.sl : ""}</td>
                  <td className="py-2.5 pr-4 text-[13px] font-bold text-gray-700">{dr ? dr.particular : ""}</td>
                  <td className="py-2.5 text-right text-[13px] font-bold text-red-500">{dr ? fmt(dr.amount) : ""}</td>
                </tr>
              );
            })}

            {/* ── Totals row ── */}
            <tr className="border-b border-gray-200 bg-gray-100 w-full">
              <td colSpan={2} className="py-3 pr-4 text-right text-[13px] font-bold text-gray-800">
                Total Credits:
              </td>
              <td className="py-3 pr-8 text-right text-[13px] font-bold text-green-600">
                {fmt(totalCredits)}
              </td>
              <td colSpan={2} className="py-3 pr-4 text-right text-[13px] font-bold text-gray-800">
                Total Debits:
              </td>
              <td className="py-3 text-right text-[13px] font-bold text-red-500">
                {fmt(totalDebits)}
              </td>
            </tr>

            {/* Opening cash is matched against the current cash position. */}
            <tr className="border-b border-gray-200 bg-slate-50">
              <td colSpan={2} className="py-2.5 pr-4 text-right text-[13px] font-semibold text-gray-700">
                Opening Cash Balance:
              </td>
              <td className="py-2.5 pr-8 text-right text-[13px] font-bold text-green-700">
                {filters.includeOpeningCash ? fmt(openingBalances.opening_cash) : "—"}
              </td>
              <td colSpan={2} className="py-2.5 pr-4 text-right text-[13px] font-semibold text-gray-700">
                Current Cash in Hand:
              </td>
              <td className="py-2.5 text-right text-[13px] font-bold text-blue-700">
                {fmt(cashInHandRaw)}
              </td>
            </tr>

            <tr className="bg-slate-50">
              <td colSpan={2} className="py-2.5 pr-4 text-right text-[13px] font-bold text-green-700">
                Opening Bank Balance:
              </td>
              <td className="py-2.5 pr-8 text-right text-[13px] font-bold text-gray-900">
                {filters.includeOpeningBank ? fmt(openingBalances.opening_bank) : "—"}
              </td>
              <td colSpan={2} className="py-2.5 pr-4 text-right text-[13px] font-bold text-blue-700">
                Current Bank Balance:
              </td>
              <td className="py-2.5 text-right text-[13px] font-bold text-gray-900">
                {fmt(bankBalanceRaw)}
              </td>
            </tr>

            <tr className={isTally ? "bg-green-100" : "bg-amber-100"}>
              <td colSpan={2} className="py-3 pr-4 text-right text-[13px] font-bold text-gray-800">
                Grand Total (Credits + Opening Balances):
              </td>
              <td className="py-3 pr-8 text-right text-[13px] font-bold text-green-900">
                {fmt(creditGrandTotal)}
              </td>
              <td colSpan={2} className="py-3 pr-4 text-right text-[13px] font-bold text-gray-800">
                Grand Total (Debits + Current Balances):
              </td>
              <td className="py-3 text-right text-[13px] font-bold text-green-900">
                {fmt(debitGrandTotal)}
              </td>
            </tr>
            {!isTally && <tr className="bg-amber-50"><td colSpan={6} className="px-4 py-2 text-center text-xs font-medium text-amber-800">Totals differ because the selected report filters exclude some transactions. Clear the filters to view the fully tallied books.</td></tr>}

          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CreditsDebits;
