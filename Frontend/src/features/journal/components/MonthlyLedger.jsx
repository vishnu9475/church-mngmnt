import { useEffect, useMemo, useState } from "react";
import PaginationControls from "../../../components/common/PaginationControls";

const PAGE_SIZE = 25;

// MonthlyLedger — Component 66
// Props:
//   month                string
//   transactions         Array<{ date, receiptNo, voucherNo, particulars,
//                                cashAmount (+receipt/-bill), bankAmount (+receipt/-bill) }>
//   openingCashBalance   number
//   openingBankBalance   number



export default function MonthlyLedger({
  month = "April 2026",
  transactions = [],
  openingCashBalance = 0,
  openingBankBalance = 0,
}) {
  const [page, setPage] = useState(1);
  // ── Compute all totals from signed amounts ──────────────
  const netCashMovement = transactions.reduce((sum, item) => sum + Number(item.cashAmount || 0), 0);
  const netBankMovement = transactions.reduce((sum, item) => sum + Number(item.bankAmount || 0), 0);
  const cashReceipts = transactions.reduce((sum, item) => sum + Math.max(Number(item.cashAmount || 0), 0), 0);
  const bankReceipts = transactions.reduce((sum, item) => sum + Math.max(Number(item.bankAmount || 0), 0), 0);
  const cashPayments = transactions.reduce((sum, item) => sum + Math.abs(Math.min(Number(item.cashAmount || 0), 0)), 0);
  const bankPayments = transactions.reduce((sum, item) => sum + Math.abs(Math.min(Number(item.bankAmount || 0), 0)), 0);
  const amount = (value) => value ? `₹${Math.abs(Number(value)).toFixed(2)}` : "–";
  // Tally rule for each account: opening balance + receipts = payments + closing balance.
  const closingCash = Number(openingCashBalance || 0) + netCashMovement;
  const closingBank = Number(openingBankBalance || 0) + netBankMovement;
  const cashTallyReceipts = Number(openingCashBalance || 0) + cashReceipts;
  const bankTallyReceipts = Number(openingBankBalance || 0) + bankReceipts;
  const cashTallyPayments = cashPayments + closingCash;
  const bankTallyPayments = bankPayments + closingBank;
  const cashTallies = Math.abs(cashTallyReceipts - cashTallyPayments) < 0.01;
  const bankTallies = Math.abs(bankTallyReceipts - bankTallyPayments) < 0.01;

  useEffect(() => {
    setPage(1);
  }, [month, transactions.length]);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTransactions = useMemo(
    () => transactions.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    ),
    [currentPage, transactions],
  );

  // totals used only for Monthly Totals row in table

  return (
    <div style={s.tableCard}>

        <div style={s.header}>
          <span style={s.monthLabel}>{month} – Journal</span>
          <span style={s.txCount}>{transactions.length} transactions</span>
        </div>

        <div style={s.tableScroll}>
          <table style={s.table}>
            <thead>
              <tr style={s.headRow}>
                <th style={s.th}>Date</th>
                <th style={s.th}>Receipt No</th>
                <th style={s.th}>Voucher No</th>
                <th style={{ ...s.th, minWidth: "230px" }}>Particulars</th>
                <th style={{ ...s.th, textAlign: "right" }}>Cash Receipts</th>
                <th style={{ ...s.th, textAlign: "right" }}>Bank Receipts</th>
                <th style={{ ...s.th, textAlign: "right" }}>Cash Payments</th>
                <th style={{ ...s.th, textAlign: "right" }}>Bank Payments</th>
              </tr>
            </thead>

            <tbody>
              {/* Opening Balance */}
              <tr style={s.openingRow}>
                <td style={s.sectionCell}>Opening Balance</td>
                <td style={s.sectionCell}>—</td>
                <td style={s.sectionCell}>—</td>
                <td style={s.sectionCell}>—</td>
                <td style={{ ...s.sectionCell, textAlign: "right", color: "#2563eb" }}>
                  {amount(openingCashBalance)}
                </td>
                <td style={{ ...s.sectionCell, textAlign: "right", color: "#16a34a" }}>
                  {amount(openingBankBalance)}
                </td>
                <td style={{ ...s.sectionCell, textAlign: "right" }}>—</td>
                <td style={{ ...s.sectionCell, textAlign: "right" }}>—</td>
              </tr>

              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} style={s.emptyCell}>No transactions for this selected period.</td>
                </tr>
              )}

              {paginatedTransactions.map((row, i) => (
                <tr key={i} style={s.dataRow}>
                  <td style={s.td}>{row.date}</td>

                  <td style={s.td}>
                    {row.receiptNo && <span style={s.receiptTag}>{row.receiptNo}</span>}
                  </td>

                  <td style={s.td}>
                    {row.voucherNo && <span style={s.voucherTag}>{row.voucherNo}</span>}
                  </td>

                  <td style={s.td}>{row.particulars}</td>

                  <td style={{ ...s.amountCell, color: "#2563eb" }}>
                    {row.cashAmount > 0 ? amount(row.cashAmount) : "–"}
                  </td>

                  <td style={{ ...s.amountCell, color: "#16a34a" }}>
                    {row.bankAmount > 0 ? amount(row.bankAmount) : "–"}
                  </td>
                  <td style={{ ...s.amountCell, color: "#dc2626" }}>
                    {row.cashAmount < 0 ? amount(row.cashAmount) : "–"}
                  </td>
                  <td style={{ ...s.amountCell, color: "#dc2626" }}>
                    {row.bankAmount < 0 ? amount(row.bankAmount) : "–"}
                  </td>
                </tr>
              ))}

              {/* Period totals */}
              <tr style={s.totalRow}>
                <td colSpan={4} style={s.totalLabel}>Period Totals</td>
                <td style={{ ...s.totalCell, color: "#2563eb" }}>
                  {amount(cashReceipts)}
                </td>
                <td style={{ ...s.totalCell, color: "#16a34a" }}>
                  {amount(bankReceipts)}
                </td>
                <td style={{ ...s.totalCell, color: "#dc2626" }}>
                  {amount(cashPayments)}
                </td>
                <td style={{ ...s.totalCell, color: "#dc2626" }}>
                  {amount(bankPayments)}
                </td>
              </tr>
              <tr style={s.netRow}>
                <td colSpan={4} style={s.totalLabel}>Net Period Movement</td>
                <td style={{ ...s.totalCell, color: netCashMovement >= 0 ? "#2563eb" : "#94a3b8" }}>{netCashMovement >= 0 ? amount(netCashMovement) : "–"}</td>
                <td style={{ ...s.totalCell, color: netBankMovement >= 0 ? "#16a34a" : "#94a3b8" }}>{netBankMovement >= 0 ? amount(netBankMovement) : "–"}</td>
                <td style={{ ...s.totalCell, color: netCashMovement < 0 ? "#dc2626" : "#94a3b8" }}>{netCashMovement < 0 ? amount(netCashMovement) : "–"}</td>
                <td style={{ ...s.totalCell, color: netBankMovement < 0 ? "#dc2626" : "#94a3b8" }}>{netBankMovement < 0 ? amount(netBankMovement) : "–"}</td>
              </tr>
              <tr style={s.closingRow}>
                <td colSpan={4} style={s.totalLabel}>Closing Balance</td>
                <td style={{ ...s.totalCell, color: "#94a3b8" }}>—</td>
                <td style={{ ...s.totalCell, color: "#94a3b8" }}>—</td>
                <td style={{ ...s.totalCell, color: "#1d4ed8" }}>{amount(closingCash)}</td>
                <td style={{ ...s.totalCell, color: "#15803d" }}>{amount(closingBank)}</td>
              </tr>
              <tr style={(cashTallies && bankTallies) ? s.tallyRow : s.tallyWarningRow}>
                <td colSpan={4} style={s.totalLabel}>Tally Grand Total</td>
                <td style={s.totalCell}>{amount(cashTallyReceipts)}</td>
                <td style={s.totalCell}>{amount(bankTallyReceipts)}</td>
                <td style={s.totalCell}>{amount(cashTallyPayments)}</td>
                <td style={s.totalCell}>{amount(bankTallyPayments)}</td>
              </tr>
              {(!cashTallies || !bankTallies) && <tr style={s.warningRow}><td colSpan={8} style={s.warningCell}>The ledger does not tally because one or more saved transactions have an inconsistent cash or bank amount.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={s.paginationWrap}>
          <PaginationControls
            page={currentPage}
            pageSize={PAGE_SIZE}
            totalCount={transactions.length}
            onPageChange={setPage}
          />
        </div>
      </div>
  );
}

const s = {
  tableCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    overflow: "hidden",
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    borderBottom: "1px solid #e2e8f0",
    fontFamily: "'Segoe UI', sans-serif"
  },
  monthLabel: { fontSize: "15px", fontWeight: "700", color: "#1a202c" },
  txCount:    { fontSize: "12px", color: "#718096" },
  tableScroll: { overflowX: "auto", width: "100%" },
  table: { width: "100%", minWidth: "1120px", borderCollapse: "collapse", fontSize: "13.5px",fontFamily: "'Segoe UI', sans-serif" },
  headRow: { backgroundColor: "#f7fafc", borderBottom: "1px solid #e2e8f0" },
  th: {
    padding: "10px 16px",
    fontWeight: "700",
    color: "#4a5568",
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  sectionCell: {
    padding: "10px 16px",
    fontWeight: "700",
    fontSize: "13px",
    color: "#2d3748",
    backgroundColor: "#f7fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  emptyCell: {
    padding: "24px 16px",
    textAlign: "center",
    color: "#9ca3af",
    fontSize: "13px",
  },
  dataRow:  { borderBottom: "1px solid #f0f4f8" },
  openingRow: { backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  td:       { padding: "11px 16px", color: "#4a5568", whiteSpace: "nowrap" },
  amountCell: { padding: "11px 16px", textAlign: "right", fontWeight: "600", whiteSpace: "nowrap" },
  receiptTag: { color: "#2563eb", fontWeight: "600" },
  voucherTag: { color: "#d97706", fontWeight: "600" },
  totalRow:  { borderTop: "2px solid #e2e8f0", backgroundColor: "#f7fafc" },
  netRow: { borderTop: "1px solid #e2e8f0", backgroundColor: "#eff6ff" },
  closingRow: { borderTop: "1px solid #dbeafe", backgroundColor: "#f8fafc" },
  tallyRow: { borderTop: "2px solid #86efac", backgroundColor: "#f0fdf4" },
  tallyWarningRow: { borderTop: "2px solid #fcd34d", backgroundColor: "#fffbeb" },
  warningRow: { backgroundColor: "#fffbeb" },
  warningCell: { padding: "9px 16px", textAlign: "center", fontSize: "12px", color: "#92400e", fontWeight: "600" },
  totalLabel: { padding: "11px 16px", fontWeight: "700", color: "#1a202c", fontSize: "13.5px" },
  totalCell:  { padding: "11px 16px", fontWeight: "700", fontSize: "13.5px", textAlign: "right" },
  paginationWrap: { padding: "14px 16px", borderTop: "1px solid #e2e8f0" },
};
