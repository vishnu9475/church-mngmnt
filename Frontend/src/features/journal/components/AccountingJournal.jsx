import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import MonthlyLedger from "./MonthlyLedger";
import MonthlyCard from "../../reports/components/MonthlyCard";
import { getJournalByMonth, initializeData } from "../../../data/dataService";

const toIsoDate = (date) => date.toISOString().slice(0, 10);
const asDate = (value) => new Date(`${value}T00:00:00`);
const formatDate = (value) => asDate(value).toLocaleDateString("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
});
const formatAmount = (value) => `INR ${Math.abs(Number(value || 0)).toFixed(2)}`;

function presetStartDate(endDate, months) {
  const end = asDate(endDate);
  const start = new Date(end.getFullYear(), end.getMonth() - months + 1, 1);
  return toIsoDate(start);
}

export default function AccountingJournal() {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [periodType, setPeriodType] = useState("3");
  const [endDate, setEndDate] = useState("");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  const journalByMonth = useMemo(() => getJournalByMonth(), [refreshVersion]);
  const monthKeys = Object.keys(journalByMonth).sort((first, second) => new Date(first) - new Date(second));
  const allTransactions = useMemo(() => monthKeys
    .flatMap((month) => (journalByMonth[month]?.transactions || []).map((transaction) => ({ ...transaction, month })))
    .filter((transaction) => transaction.entryDate)
    .sort((first, second) => new Date(first.entryDate) - new Date(second.entryDate)), [journalByMonth, monthKeys]);

  const latestAvailableDate = allTransactions.at(-1)?.entryDate || toIsoDate(new Date());
  const chosenEndDate = endDate || latestAvailableDate;
  const normalizedCustomFrom = customFromDate || presetStartDate(chosenEndDate, 3);
  const normalizedCustomTo = customToDate || chosenEndDate;
  const presetMonths = Number(periodType);
  const periodStart = periodType === "custom"
    ? (normalizedCustomFrom <= normalizedCustomTo ? normalizedCustomFrom : normalizedCustomTo)
    : presetStartDate(chosenEndDate, presetMonths);
  const periodEnd = periodType === "custom"
    ? (normalizedCustomFrom <= normalizedCustomTo ? normalizedCustomTo : normalizedCustomFrom)
    : chosenEndDate;

  const periodLabel = periodType === "custom"
    ? `Custom Ledger: ${formatDate(periodStart)} to ${formatDate(periodEnd)}`
    : `${periodType === "3" ? "Quarterly" : periodType === "6" ? "Half-Yearly" : "Annual"} Ledger: ${formatDate(periodStart)} to ${formatDate(periodEnd)}`;

  const opening = useMemo(() => {
    const firstMonth = monthKeys[0];
    const firstMonthData = firstMonth ? journalByMonth[firstMonth] : null;
    const startingCash = Number(firstMonthData?.openingCashBalance || 0);
    const startingBank = Number(firstMonthData?.openingBankBalance || 0);
    const beforePeriod = allTransactions.filter((transaction) => transaction.entryDate < periodStart);
    return {
      cash: startingCash + beforePeriod.reduce((sum, transaction) => sum + Number(transaction.cashAmount || 0), 0),
      bank: startingBank + beforePeriod.reduce((sum, transaction) => sum + Number(transaction.bankAmount || 0), 0),
    };
  }, [allTransactions, journalByMonth, monthKeys, periodStart]);

  const transactions = allTransactions.filter((transaction) => transaction.entryDate >= periodStart && transaction.entryDate <= periodEnd);
  const totalReceiptCash = transactions.filter((transaction) => transaction.entryType === "receipt" && transaction.cashAmount > 0).reduce((sum, transaction) => sum + transaction.cashAmount, 0);
  const totalReceiptBank = transactions.filter((transaction) => transaction.entryType === "receipt" && transaction.bankAmount > 0).reduce((sum, transaction) => sum + transaction.bankAmount, 0);
  const totalBillsCash = transactions.filter((transaction) => transaction.entryType === "bill" && transaction.cashAmount < 0).reduce((sum, transaction) => sum + Math.abs(transaction.cashAmount), 0);
  const totalBillsBank = transactions.filter((transaction) => transaction.entryType === "bill" && transaction.bankAmount < 0).reduce((sum, transaction) => sum + Math.abs(transaction.bankAmount), 0);
  const cashTransfers = transactions.filter((transaction) => transaction.entryType === "transfer").reduce((sum, transaction) => sum + Number(transaction.cashAmount || 0), 0);
  const bankTransfers = transactions.filter((transaction) => transaction.entryType === "transfer").reduce((sum, transaction) => sum + Number(transaction.bankAmount || 0), 0);
  const totalReceipts = totalReceiptCash + totalReceiptBank;
  const totalBills = totalBillsCash + totalBillsBank;
  const finalCash = opening.cash + totalReceiptCash - totalBillsCash + cashTransfers;
  const finalBank = opening.bank + totalReceiptBank - totalBillsBank + bankTransfers;

  const refreshJournal = async () => {
    setIsRefreshing(true);
    setRefreshError("");
    try {
      await initializeData();
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      setRefreshError(`Could not refresh journal: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Church Management - Accounting Journal Ledger", 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Period: ${formatDate(periodStart)} to ${formatDate(periodEnd)}`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 27);
    doc.text(`Opening Cash: ${formatAmount(opening.cash)}    Opening Bank: ${formatAmount(opening.bank)}`, 14, 32);

    // Keep the PDF ledger identical to the screen: separate receipt and
    // payment columns for cash and bank, followed by the tally rows.
    const ledgerCashReceipts = transactions.reduce((sum, transaction) => sum + Math.max(Number(transaction.cashAmount || 0), 0), 0);
    const ledgerBankReceipts = transactions.reduce((sum, transaction) => sum + Math.max(Number(transaction.bankAmount || 0), 0), 0);
    const ledgerCashPayments = transactions.reduce((sum, transaction) => sum + Math.abs(Math.min(Number(transaction.cashAmount || 0), 0)), 0);
    const ledgerBankPayments = transactions.reduce((sum, transaction) => sum + Math.abs(Math.min(Number(transaction.bankAmount || 0), 0)), 0);
    const netCashMovement = ledgerCashReceipts - ledgerCashPayments;
    const netBankMovement = ledgerBankReceipts - ledgerBankPayments;
    const cashTallyReceipts = Number(opening.cash || 0) + ledgerCashReceipts;
    const bankTallyReceipts = Number(opening.bank || 0) + ledgerBankReceipts;
    const cashTallyPayments = ledgerCashPayments + finalCash;
    const bankTallyPayments = ledgerBankPayments + finalBank;
    const pdfAmount = (value) => `INR ${Math.abs(Number(value || 0)).toFixed(2)}`;
    const positiveOrDash = (value) => Number(value || 0) > 0 ? pdfAmount(value) : "-";

    const rows = [
      ["Opening Balance", "-", "-", "-", pdfAmount(opening.cash), pdfAmount(opening.bank), "-", "-"],
      ...transactions.map((transaction) => {
        const cash = Number(transaction.cashAmount || 0);
        const bank = Number(transaction.bankAmount || 0);
        return [
          formatDate(transaction.entryDate),
          transaction.receiptNo || "-",
          transaction.voucherNo || "-",
          transaction.particulars || "-",
          positiveOrDash(cash),
          positiveOrDash(bank),
          cash < 0 ? pdfAmount(cash) : "-",
          bank < 0 ? pdfAmount(bank) : "-",
        ];
      }),
    ];

    autoTable(doc, {
      startY: 38,
      head: [["Date", "Receipt No", "Voucher No", "Particulars", "Cash Receipts", "Bank Receipts", "Cash Payments", "Bank Payments"]],
      body: rows,
      foot: [
        ["", "", "", "Period Totals", pdfAmount(ledgerCashReceipts), pdfAmount(ledgerBankReceipts), pdfAmount(ledgerCashPayments), pdfAmount(ledgerBankPayments)],
        ["", "", "", "Net Period Movement", positiveOrDash(netCashMovement), positiveOrDash(netBankMovement), netCashMovement < 0 ? pdfAmount(netCashMovement) : "-", netBankMovement < 0 ? pdfAmount(netBankMovement) : "-"],
        ["", "", "", "Closing Balance", "-", "-", pdfAmount(finalCash), pdfAmount(finalBank)],
        ["", "", "", "Tally Grand Total", pdfAmount(cashTallyReceipts), pdfAmount(bankTallyReceipts), pdfAmount(cashTallyPayments), pdfAmount(bankTallyPayments)],
      ],
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.6, valign: "middle" },
      headStyles: { fillColor: [55, 65, 81] },
      footStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 24 }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 }, 3: { cellWidth: 68 },
        4: { halign: "right", cellWidth: 31.5 }, 5: { halign: "right", cellWidth: 31.5 },
        6: { halign: "right", cellWidth: 31.5 }, 7: { halign: "right", cellWidth: 31.5 },
      },
    });

    // These balances are calculated from the selected report period, rather
    // than the current all-time balance shown elsewhere in the application.
    let summaryY = (doc.lastAutoTable?.finalY || 38) + 10;
    if (summaryY > 180) {
      doc.addPage();
      summaryY = 18;
    }
    autoTable(doc, {
      startY: summaryY,
      head: [["Total Receipts", "Total Bills", "Final Cash in Hand", "Final Bank Balance"]],
      body: [[
        formatAmount(totalReceipts),
        formatAmount(totalBills),
        formatAmount(finalCash),
        formatAmount(finalBank),
      ]],
      theme: "grid",
      // Four equal columns use the complete printable width of landscape A4.
      // Line wrapping prevents long headings or larger INR values from spilling
      // outside the audit-summary row.
      margin: { left: 14, right: 14 },
      tableWidth: 268,
      styles: { fontSize: 8, cellPadding: 1.6, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: "bold", fontSize: 7.5, halign: "center" },
      bodyStyles: { halign: "center", fontStyle: "bold", fontSize: 8 },
      columnStyles: { 0: { cellWidth: 67 }, 1: { cellWidth: 67 }, 2: { cellWidth: 67 }, 3: { cellWidth: 67 } },
    });
    doc.save(`journal-ledger-${periodStart}-to-${periodEnd}.pdf`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Accounting Journal Ledger</h1>
          <p style={styles.subtitle}>Download quarterly, half-yearly, annual, or custom-date ledger reports.</p>
        </div>
        <div style={styles.headerButtons}>
          <button type="button" onClick={refreshJournal} disabled={isRefreshing} style={styles.refreshButton}>{isRefreshing ? "Refreshing..." : "Refresh"}</button>
          <button type="button" onClick={downloadPdf} style={styles.downloadButton}>Download PDF</button>
        </div>
      </div>

      <div style={styles.filterCard}>
        <div style={styles.filterGrid}>
          <label style={styles.label}>Report period
            <select value={periodType} onChange={(event) => setPeriodType(event.target.value)} style={styles.control}>
              <option value="3">Quarterly (3 months)</option>
              <option value="6">Half-Yearly (6 months)</option>
              <option value="12">Annual (12 months)</option>
              <option value="custom">Custom date range</option>
            </select>
          </label>
          {periodType === "custom" ? <>
            <label style={styles.label}>From date<input type="date" value={customFromDate} onChange={(event) => setCustomFromDate(event.target.value)} style={styles.control} /></label>
            <label style={styles.label}>To date<input type="date" value={customToDate} onChange={(event) => setCustomToDate(event.target.value)} style={styles.control} /></label>
          </> : <label style={styles.label}>Period ending on<input type="date" value={chosenEndDate} max={latestAvailableDate} onChange={(event) => setEndDate(event.target.value)} style={styles.control} /></label>}
          <div style={styles.periodReadout}><span style={styles.readoutLabel}>Selected period</span><strong>{formatDate(periodStart)} – {formatDate(periodEnd)}</strong></div>
        </div>
      </div>

      {refreshError && <p style={styles.error}>{refreshError}</p>}
      <MonthlyLedger month={periodLabel} transactions={transactions} openingCashBalance={opening.cash} openingBankBalance={opening.bank} />
      <MonthlyCard totalReceipts={totalReceipts} totalBills={totalBills} finalCash={finalCash} finalBank={finalBank} totalReceiptsLabel="Total Receipts" totalBillsLabel="Total Bills" />
    </div>
  );
}

const styles = {
  page: { flex: 1, padding: "28px 32px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column", gap: "20px" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" },
  title: { fontSize: "22px", fontWeight: "700", color: "#1a202c", margin: "0 0 4px" },
  subtitle: { fontSize: "13px", color: "#718096", margin: 0 },
  headerButtons: { display: "flex", flexWrap: "wrap", gap: "8px" },
  refreshButton: { fontSize: "14px", fontWeight: "600", color: "#1d4ed8", border: "1.5px solid #bfdbfe", borderRadius: "7px", padding: "8px 14px", backgroundColor: "#eff6ff", cursor: "pointer" },
  downloadButton: { fontSize: "14px", fontWeight: "600", color: "#fff", border: "1px solid #111827", borderRadius: "7px", padding: "8px 14px", backgroundColor: "#111827", cursor: "pointer" },
  filterCard: { border: "1px solid #e2e8f0", borderRadius: "10px", backgroundColor: "#fff", padding: "16px" },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px", alignItems: "end" },
  label: { display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: "700", color: "#475569" },
  control: { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "7px", padding: "9px 10px", color: "#1e293b", backgroundColor: "#fff", fontSize: "14px" },
  periodReadout: { minHeight: "38px", display: "flex", flexDirection: "column", justifyContent: "center", borderLeft: "3px solid #2563eb", paddingLeft: "10px", color: "#1e3a8a", fontSize: "13px" },
  readoutLabel: { color: "#64748b", fontSize: "11px", marginBottom: "3px" },
  error: { margin: "-8px 0 0", color: "#b91c1c", fontSize: "13px" },
};
