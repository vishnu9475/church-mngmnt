import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import FinancialReports from "../components/FinancialReports";
import ReportCategory from "../components/ReportCategory";
import ReportFilters from "../components/ReportFilters";
import CreditsDebits from "../components/CreditsDebits";
import SideMenu from "../../../components/common/Sidemenu";
import MonthlyCard from "../components/MonthlyCard";
import {
  getCashBankSummary,
  getCreditsDebitsStatement,
  getSettings,
} from "../../../data/dataService";

const FinancialReportsPage = () => {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    receiptCategory: "All Categories",
    billCategory: "All Categories",
    includeOpeningCash: true,
    includeOpeningBank: true,
  });

  const statement = getCreditsDebitsStatement(filters);

  const totalCredits = statement.creditRows
    // Opening balances are financial-position values, not current-period
    // income. Keep this total equal to the Credits & Debits transaction row.
    .filter((row) => row.show && row.sl !== "-")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const totalDebits = statement.debitRows
    // Likewise, only paid bill rows are expenses; opening bank balance is
    // displayed separately in the statement's tally section.
    .filter((row) => row.show !== false && row.sl !== "-")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const currentBalances = getCashBankSummary();

  const handleDownload = () => {
    const { creditRows, debitRows } = statement;

    // Opening balances are displayed in the summary table, not as transactions.
    const visibleCredits = creditRows.filter(
      (row) => row.show && row.sl !== "-"
    );
    const visibleDebits = debitRows.filter(
      (row) => row.show !== false && row.sl !== "-"
    );

    const balances = currentBalances;
    const settings = getSettings();

    const openingCash = Number(settings.opening_cash || 0);
    const openingBank = Number(settings.opening_bank || 0);
    // Match the on-screen tally: credits plus opening balances must equal
    // debits plus the current cash and bank positions.
    const includedOpeningCash = filters.includeOpeningCash === false ? 0 : openingCash;
    const includedOpeningBank = filters.includeOpeningBank === false ? 0 : openingBank;
    const creditGrandTotal = totalCredits + includedOpeningCash + includedOpeningBank;
    const debitGrandTotal = totalDebits + Number(balances.cashInHandRaw || 0) + Number(balances.bankBalanceRaw || 0);
    const isTally = Math.abs(creditGrandTotal - debitGrandTotal) < 0.01;

    const formatAmount = (amount) =>
      `INR ${Number(amount || 0).toFixed(2)}`;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Church Management - Financial Report", 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 22);
    doc.text(
      `Period: ${filters.fromDate || "All dates"} to ${
        filters.toDate || "Today"
      }`,
      14,
      27
    );
    doc.text(
      `Receipt category: ${filters.receiptCategory}    |    Bill category: ${filters.billCategory}`,
      14,
      32
    );

    const rowCount = Math.max(
      visibleCredits.length,
      visibleDebits.length
    );

    const tableRows = Array.from({ length: rowCount }, (_, index) => {
      const credit = visibleCredits[index];
      const debit = visibleDebits[index];

      return [
        credit?.sl ?? "",
        credit?.particular ?? "",
        credit ? formatAmount(credit.amount) : "",
        debit?.sl ?? "",
        debit?.particular ?? "",
        debit ? formatAmount(debit.amount) : "",
      ];
    });

    autoTable(doc, {
      startY: 38,
      head: [
        [
          "SL",
          "Credits Particulars",
          "Amount",
          "SL",
          "Debits Particulars",
          "Amount",
        ],
      ],
      body: tableRows.length
        ? tableRows
        : [["", "No matching credits", "", "", "No matching debits", ""]],
      foot: [
        [
          "",
          "Total Credits",
          formatAmount(totalCredits),
          "",
          "Total Debits",
          formatAmount(totalDebits),
        ],
      ],
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [75, 85, 99],
      },
      footStyles: {
        fillColor: [240, 253, 244],
        textColor: [22, 101, 52],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: "right", cellWidth: 27 },
        3: { cellWidth: 10 },
        5: { halign: "right", cellWidth: 27 },
      },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Credits Tally", "Amount", "Debits Tally", "Amount"]],
      body: [
        ["Total Credits", formatAmount(totalCredits), "Total Debits", formatAmount(totalDebits)],
        ["Opening Cash Balance", filters.includeOpeningCash === false ? "Not included" : formatAmount(openingCash), "Current Cash in Hand", formatAmount(balances.cashInHandRaw)],
        ["Opening Bank Balance", filters.includeOpeningBank === false ? "Not included" : formatAmount(openingBank), "Current Bank Balance", formatAmount(balances.bankBalanceRaw)],
      ],
      foot: [[
        "Grand Total (Credits + Opening Balances)", formatAmount(creditGrandTotal),
        "Grand Total (Debits + Current Balances)", formatAmount(debitGrandTotal),
      ]],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.5, valign: "middle" },
      headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      bodyStyles: { textColor: [31, 41, 55] },
      footStyles: {
        fillColor: isTally ? [220, 252, 231] : [254, 243, 199],
        textColor: isTally ? [20, 83, 45] : [146, 64, 14],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 77 }, 1: { cellWidth: 57, halign: "right" },
        2: { cellWidth: 77 }, 3: { cellWidth: 57, halign: "right" },
      },
    });

    if (!isTally) {
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14);
      doc.text("Totals differ because the selected report filters exclude some transactions. Clear the filters to view the fully tallied books.", 14, doc.lastAutoTable.finalY + 6);
    }

    doc.save(
      `financial-report-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SideMenu />

      <main className="min-w-0 p-4 sm:p-6 lg:ml-58">
        <FinancialReports />

        <div className="mt-4 sm:mt-6">
          <ReportCategory />
        </div>

        <div className="mt-4 sm:mt-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            onDownload={handleDownload}
          />
        </div>

        <div className="mt-4 sm:mt-6">
          <CreditsDebits filters={filters} />
        </div>

        <div className="mt-6 sm:mt-8">
          <MonthlyCard
            totalReceiptsLabel="Total Credits"
            totalBillsLabel="Total Debits"
            totalReceipts={totalCredits}
            totalBills={totalDebits}
            finalCash={currentBalances.cashInHandRaw}
            finalBank={currentBalances.bankBalanceRaw}
          />
        </div>
      </main>
    </div>
  );
};

export default FinancialReportsPage;
