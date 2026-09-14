import { useState } from "react";
import { FaDownload } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCategories, getReceiptsByCategoryName } from "../../../data/dataService";

const paymentMethods = ["Cash", "Bank Transfer", "UPI", "Cheque"];
const amount = (value) => Number(value || 0);
const money = (value) => `₹${amount(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const matchingMethod = (value) => paymentMethods.find((method) => method.toLowerCase() === String(value || "").trim().toLowerCase());

function getIncomePaymentMethodTotals(receipts) {
  const totals = Object.fromEntries(paymentMethods.map((method) => [method, 0]));
  receipts.forEach((receipt) => {
    const method = matchingMethod(receipt.paymentMethod);
    if (method) totals[method] += amount(receipt.amount);
  });
  return { ...totals, total: receipts.reduce((sum, receipt) => sum + amount(receipt.amount), 0) };
}

function downloadIncomePaymentMethodReport({ title, receipts }) {
  const totals = getIncomePaymentMethodTotals(receipts);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.text(title, 14, 15);
  autoTable(doc, {
    startY: 22,
    head: [["SL", "Receipt No", "Date", "Title", "Payer", ...paymentMethods, "Total"]],
    body: receipts.map((receipt, index) => {
      const method = matchingMethod(receipt.paymentMethod);
      return [index + 1, receipt.receiptNo || "-", receipt.date || "-", receipt.title || "-", receipt.payer || "-", ...paymentMethods.map((column) => method === column ? `INR ${amount(receipt.amount).toFixed(2)}` : "-"), `INR ${amount(receipt.amount).toFixed(2)}`];
    }),
    foot: [["", "", "", "", "Total Amount Received", ...paymentMethods.map((method) => `INR ${totals[method].toFixed(2)}`), `INR ${totals.total.toFixed(2)}`]],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [75, 85, 99] },
    footStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: "bold" },
  });
  doc.save(`${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}.pdf`);
}

function IncomeReceiptAuditTable({ receipts }) {
  const totals = getIncomePaymentMethodTotals(receipts);
  return <div className="overflow-auto max-h-[373px]"><table className="min-w-[1100px] w-full border border-gray-200 text-xs whitespace-nowrap"><thead><tr className="bg-gray-50">{["SL", "Receipt No", "Date", "Title", "Payer", ...paymentMethods, "Total"].map((heading) => <th key={heading} className="border border-gray-200 px-2 py-2 text-center">{heading}</th>)}</tr></thead><tbody>{!receipts.length && <tr><td colSpan={10} className="border border-gray-200 px-2 py-5 text-center text-gray-500">No receipts found for this category.</td></tr>}{receipts.map((receipt, index) => { const method = matchingMethod(receipt.paymentMethod); return <tr key={`${receipt.receiptNo || "receipt"}-${index}`}><td className="border border-gray-200 px-2 py-2 text-center">{index + 1}</td><td className="border border-gray-200 px-2 py-2 text-blue-600">{receipt.receiptNo}</td><td className="border border-gray-200 px-2 py-2">{receipt.date}</td><td className="border border-gray-200 px-2 py-2">{receipt.title}</td><td className="border border-gray-200 px-2 py-2">{receipt.payer}</td>{paymentMethods.map((column) => <td key={column} className="border border-gray-200 px-2 py-2 text-right text-green-700">{method === column ? money(receipt.amount) : "-"}</td>)}<td className="border border-gray-200 px-2 py-2 text-right font-semibold text-green-700">{money(receipt.amount)}</td></tr>; })}</tbody><tfoot><tr className="bg-green-50 font-semibold"><td colSpan={5} className="border border-gray-200 px-2 py-2 text-right">Total Amount Received</td>{paymentMethods.map((method) => <td key={method} className="border border-gray-200 px-2 py-2 text-right text-green-700">{money(totals[method])}</td>)}<td className="border border-gray-200 px-2 py-2 text-right text-green-800">{money(totals.total)}</td></tr></tfoot></table></div>;
}

function IncomeCategorySection({ title, receipts, isOpen, onToggle }) {
  const totals = getIncomePaymentMethodTotals(receipts);

  return (
    <div className="bg-white rounded-xl p-4 mb-4 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
      <div className="flex items-center justify-between bg-gray-50 px-3 py-3 rounded-lg mb-2">
        <button onClick={onToggle} className="flex items-center gap-2 font-semibold text-sm">
          <span>{isOpen ? "▲" : "▼"}</span>
          <span>{title}</span>
        </button>
        <button
          type="button"
          onClick={() => downloadIncomePaymentMethodReport({ title: `${title} Report`, receipts })}
          className="bg-black text-white p-2 rounded-lg hover:bg-gray-800 transition-all"
          aria-label={`Download ${title} report`}
        >
          <FaDownload />
        </button>
      </div>

      {isOpen && (
        <>
          <div className="text-right text-xs text-gray-500 mb-2">
            {receipts.length} receipts • ₹{totals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <IncomeReceiptAuditTable receipts={receipts} />
        </>
      )}
    </div>
  );
}

export default function CategoryWiseAnnualReport() {
  const [openSection, setOpenSection] = useState("");
  // Read inside render so categories and receipts come from the data loaded
  // from Django/MySQL. This intentionally includes categories with zero receipts.
  const receiptCategories = getCategories("Receipt");

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 p-3 py-4">
      <div className="w-full bg-white border border-gray-300 rounded-lg p-3 md:p-5 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Income-wise Annual Reports</h1>
        <p className="text-gray-500 text-xs mb-6">Financial Year 2026-2027</p>
        <h2 className="font-bold text-base mb-4">Receipts (Income) by Category</h2>

        {receiptCategories.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            No Receipt categories have been created yet.
          </p>
        ) : receiptCategories.map((category) => {
          const categoryId = String(category.category_id);
          return (
            <IncomeCategorySection
              key={categoryId}
              title={category.category_name}
              receipts={getReceiptsByCategoryName(category.category_name)}
              isOpen={openSection === categoryId}
              onToggle={() => setOpenSection(openSection === categoryId ? "" : categoryId)}
            />
          );
        })}
      </div>
    </div>
  );
}
