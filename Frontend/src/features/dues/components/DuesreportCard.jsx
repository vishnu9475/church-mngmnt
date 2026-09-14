import React, { useState } from "react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import { getCategories, getDuesReportByCategoryId, getDuesSummaryByCategoryId } from "../../../data/dataService";

const statusStyles = {
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-emerald-100 text-emerald-700",
};

export default function CatagoryreportCard() {
  // Read live Due categories from the API-backed store. Bill and Receipt
  // categories are deliberately excluded from the Dues report.
  const dueCategories = getCategories("Due");

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8 lg:pl-58 4k:space-y-14">
      <Link
        to="/reports"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
      >
        ← Back to Financial Reports
      </Link>
      <header className="border-b border-slate-200/60 pb-5 md:pb-6 4k:pb-10">
        <h1 className="text-xl sm:text-2xl font-bold mb-1 2xl:text-3xl 4k:text-4xl ">
          Dues Report by Category
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm 2xl:text-base 4k:text-2xl font-medium text-slate-500">
          Track outstanding payment status for all dues across families
        </p>
      </header>

      {dueCategories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
          No Due categories have been created yet.
        </div>
      ) : dueCategories.map((category) => {
        const rows = getDuesReportByCategoryId(category.category_id);
        const summary = getDuesSummaryByCategoryId(category.category_id);
        return (
          <div key={category.category_id} className="w-full min-w-0">
            <FundReportTableCard
              title={`${category.category_name} Dues`}
              progress={summary.progress}
              rows={rows}
              summary={summary}
            />
          </div>
        );
      })}
    </div>
  );
}

function FundReportTableCard({ title, progress, rows = [], summary }) {
  const [isOpen, setIsOpen] = useState(true);

  const cleanCurrency = (str) => {
    if (!str) return "INR 0.00";
    return str.replace(/₹/g, "INR ");
  };

  const downloadPDF = (e) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const cleanProgress = cleanCurrency(progress);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`${title} Report`, 14, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Progress: ${cleanProgress}`, 14, 27);

      doc.setFillColor(51, 65, 85);
      doc.rect(14, 34, 182, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("SL", 16, 39);
      doc.text("Family & Member", 28, 39);
      doc.text("Due Title", 78, 39);
      doc.text("Due Date", 124, 39);
      doc.text("Amount", 152, 39);
      doc.text("Paid", 174, 39);

      let currentY = 48;
      doc.setTextColor(15, 23, 42);

      rows.forEach((row, index) => {
        doc.setFont("helvetica", "normal");
        doc.text(String(index + 1), 16, currentY);

        doc.setFont("helvetica", "bold");
        doc.text(row.family, 28, currentY);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`(${row.person})`, 28, currentY + 4);
        
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);

        doc.text(row.dueTitle, 78, currentY);
        doc.text(row.dueDate, 124, currentY);
        doc.text(cleanCurrency(row.amount), 152, currentY);
        doc.text(cleanCurrency(row.paid), 174, currentY);

        doc.setDrawColor(241, 245, 249);
        doc.line(14, currentY + 6, 196, currentY + 6);

        currentY += 14; 
      });

      currentY += 2;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, currentY, 196, currentY);
      
      currentY += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Total Outstanding Dues: ${cleanCurrency(summary?.totalAmount)}`, 14, currentY);
      doc.text(`Partial Amount Paid: ${cleanCurrency(summary?.totalPaid)}`, 14, currentY + 6);
      
      doc.setTextColor(220, 38, 38);
      doc.text(`Remaining Balance: ${cleanCurrency(summary?.remaining)}`, 14, currentY + 12);

      const filename = `${title.toLowerCase().replace(/\s+/g, "_")}_report.pdf`;
      doc.save(filename);

    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Something went wrong compiling your PDF layout.");
    }
  };

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white shadow-sm transition-all box-border overflow-hidden">
      {/* Fixed Header Layout Container */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-6 2xl:p-10 4k:p-16 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
          <div className="flex items-center gap-3">
            <svg
              className={`w-5 h-5 flex-shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
            <h2 className="text-base sm:text-lg 2xl:text-2xl 4k:text-4xl font-semibold text-slate-950 truncate">
              {title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm 2xl:text-base 4k:text-2xl text-slate-500 pl-8 sm:pl-0 truncate">
            {progress}
          </p>
        </div>

        {/* Responsive, Non-Breaking Action Button */}
        <button
          type="button"
          onClick={downloadPDF}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all 2xl:text-sm 4k:text-xl z-10 flex-shrink-0"
        >
          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </button>
      </div>

      {/* Dropdown collapsible container */}
      {isOpen && (
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 2xl:px-10 2xl:pb-10 4k:px-16 4k:pb-16 border-t border-slate-100 pt-4">
          <div className="overflow-x-auto rounded-lg border border-slate-100 w-full bg-transparent">
            <table className="w-full min-w-[800px] xl:min-w-[1000px] 4k:min-w-[1600px] border-collapse text-left text-sm 2xl:text-base 4k:text-2xl">
              <thead>
                <tr className="bg-slate-50 text-slate-950">
                  <th className="w-16 px-3 py-3 2xl:py-5 font-semibold text-left">SL</th>
                  <th className="px-3 py-3 2xl:py-5 font-semibold text-left">Family</th>
                  <th className="px-3 py-3 2xl:py-5 font-semibold text-left">Due Title</th>
                  <th className="px-3 py-3 2xl:py-5 font-semibold text-left">Due Date</th>
                  <th className="px-3 py-3 2xl:py-5 font-semibold text-right">Amount</th>
                  <th className="px-3 py-3 2xl:py-5 font-semibold text-right">Paid</th>
                  <th className="px-3 py-3 2xl:py-5 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-3 py-8 text-center text-sm text-slate-500">
                      No unpaid or partially paid dues found for this category.
                    </td>
                  </tr>
                )}
                {rows.map((row, index) => {
                  const uniqueKey = row.sl || `row-${index}`;
                  const badgeClass = `inline-flex min-w-16 items-center justify-center rounded px-2.5 py-1 text-xs 2xl:text-sm font-medium tracking-wide shadow-sm ${
                    statusStyles[row.statusTone] || "bg-slate-100 text-slate-700"
                  }`;

                  return (
                    <tr key={uniqueKey} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-4 2xl:py-6 text-left align-top font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-3 py-4 2xl:py-6 text-left align-top">
                        <div className="font-semibold text-slate-950">{row.family}</div>
                        <div className="mt-1 text-xs 2xl:text-sm text-slate-500">{row.person}</div>
                      </td>
                      <td className="px-3 py-4 2xl:py-6 text-left align-top text-slate-700">
                        {row.dueTitle}
                      </td>
                      <td className="px-3 py-4 2xl:py-6 text-left align-top text-slate-600 whitespace-nowrap">
                        {row.dueDate}
                      </td>
                      <td className="px-3 py-4 2xl:py-6 text-right align-top font-semibold text-slate-950">
                        {row.amount}
                      </td>
                      <td className="px-3 py-4 2xl:py-6 text-right align-top font-semibold text-emerald-600">
                        {row.paid}
                      </td>
                      <td className="px-3 py-4 2xl:py-6 text-center align-top">
                        <span className={badgeClass}>
                          {row.statusTone === "unpaid" && (
                            <span className="mr-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-red-400 text-[10px] leading-none font-bold">
                              x
                            </span>
                          )}
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 sm:mt-8 grid gap-4 rounded-xl bg-slate-50 px-4 py-5 2xl:p-8 4k:p-12 border border-slate-100 sm:grid-cols-3">
            <SummaryItem label="Total Outstanding Dues" value={summary?.totalAmount} />
            <SummaryItem label="Partial Amount Paid" value={summary?.totalPaid} tone="paid" />
            <SummaryItem label="Remaining Balance" value={summary?.remaining} tone="remaining" />
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryItem({ label, value = "₹0.00", tone = "default" }) {
  const valueClass =
    tone === "paid" ? "text-emerald-600" : tone === "remaining" ? "text-red-600" : "text-slate-950";

  return (
    <div>
      <div className="text-sm 2xl:text-base 4k:text-2xl font-medium text-slate-600">
        {label}
      </div>
      <div className={`mt-1 text-base sm:text-lg 2xl:text-2xl 4k:text-4xl font-bold tracking-tight ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
