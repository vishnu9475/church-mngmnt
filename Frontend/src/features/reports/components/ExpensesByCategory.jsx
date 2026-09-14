import { useState } from "react";
import { FaDownload } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getBillsByCategoryNames, getCategories } from "../../../data/dataService";

const paymentMethods = ["Cash", "Bank Transfer", "UPI", "Cheque"];
const amount = (value) => Number(value || 0);
const money = (value) => `\u20B9${amount(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const matchingMethod = (value) => paymentMethods.find((method) => method.toLowerCase() === String(value || "").trim().toLowerCase());

function getPaymentMethodTotals(bills) {
  const totals = Object.fromEntries(paymentMethods.map((method) => [method, 0]));
  bills.forEach((bill) => {
    const method = matchingMethod(bill.paymentMethod);
    if (method) totals[method] += amount(bill.amount);
  });
  return { ...totals, total: bills.reduce((sum, bill) => sum + amount(bill.amount), 0) };
}

function downloadExpenseReport(title, bills) {
  const totals = getPaymentMethodTotals(bills);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.text(`${title} Expense Report`, 14, 15);
  autoTable(doc, {
    startY: 22,
    head: [["SL", "Bill/Voucher No", "Type", "Date", "Title", "Vendor", ...paymentMethods, "Total"]],
    body: bills.map((bill, index) => {
      const method = matchingMethod(bill.paymentMethod);
      return [index + 1, bill.billNo || "-", bill.type || "-", bill.date || "-", bill.title || "-", bill.vendor || "-", ...paymentMethods.map((column) => method === column ? `INR ${amount(bill.amount).toFixed(2)}` : "-"), `INR ${amount(bill.amount).toFixed(2)}`];
    }),
    foot: [["", "", "", "", "", "Total Expenses", ...paymentMethods.map((method) => `INR ${totals[method].toFixed(2)}`), `INR ${totals.total.toFixed(2)}`]],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [75, 85, 99] },
    footStyles: { fillColor: [254, 242, 242], textColor: [185, 28, 28], fontStyle: "bold" },
  });
  const filename = title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  doc.save(`${filename}-expense-report.pdf`);
}

function ExpenseAuditTable({ bills }) {
  const totals = getPaymentMethodTotals(bills);
  return (
    <div className="max-h-[373px] overflow-auto">
      <table className="min-w-[1180px] w-full border border-gray-200 text-xs whitespace-nowrap">
        <thead>
          <tr className="bg-gray-50">
            {["SL", "Bill/Voucher No", "Type", "Date", "Title", "Vendor", ...paymentMethods, "Total"].map((heading) => <th key={heading} className="border border-gray-200 px-2 py-2 text-center">{heading}</th>)}
          </tr>
        </thead>
        <tbody>
          {!bills.length && <tr><td colSpan="11" className="border border-gray-200 px-2 py-5 text-center text-gray-500">No bills found for this category.</td></tr>}
          {bills.map((bill, index) => {
            const method = matchingMethod(bill.paymentMethod);
            return <tr key={`${bill.billNo || "bill"}-${index}`}><td className="border border-gray-200 px-2 py-2 text-center">{index + 1}</td><td className="border border-gray-200 px-2 py-2 text-blue-600">{bill.billNo}</td><td className="border border-gray-200 px-2 py-2">{bill.type}</td><td className="border border-gray-200 px-2 py-2">{bill.date}</td><td className="border border-gray-200 px-2 py-2">{bill.title}</td><td className="border border-gray-200 px-2 py-2">{bill.vendor}</td>{paymentMethods.map((column) => <td key={column} className="border border-gray-200 px-2 py-2 text-right text-red-600">{method === column ? money(bill.amount) : "-"}</td>)}<td className="border border-gray-200 px-2 py-2 text-right font-semibold text-red-700">{money(bill.amount)}</td></tr>;
          })}
        </tbody>
        <tfoot><tr className="bg-red-50 font-semibold"><td colSpan={6} className="border border-gray-200 px-2 py-2 text-right">Total Expenses</td>{paymentMethods.map((method) => <td key={method} className="border border-gray-200 px-2 py-2 text-right text-red-700">{money(totals[method])}</td>)}<td className="border border-gray-200 px-2 py-2 text-right text-red-800">{money(totals.total)}</td></tr></tfoot>
      </table>
    </div>
  );
}

export default function ExpensesByCategory() {
  const [openSection, setOpenSection] = useState("");
  // Read during render so category and bill data always comes from Django/MySQL.
  // Bill categories with no expenses are still shown for a complete audit view.
  const billCategories = getCategories("Bill");

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 p-3 py-4">
      <div className="w-full bg-white border border-gray-300 rounded-lg p-3 md:p-5 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Debit-wise Annual Reports</h1>
        <p className="text-gray-500 text-xs mb-6">Financial Year 2026-2027</p>
        <h2 className="font-bold text-base mb-4">Bills (Expenses) by Category</h2>

        {billCategories.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">No Bill categories have been created yet.</p>
        ) : billCategories.map((category) => {
          const categoryId = String(category.category_id);
          const bills = getBillsByCategoryNames([category.category_name]);
          const totals = getPaymentMethodTotals(bills);
          const isOpen = openSection === categoryId;
          return (
            <div key={categoryId} className="bg-white rounded-xl p-4 mb-4 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
              <div className="flex items-center justify-between bg-gray-50 px-3 py-3 rounded-lg mb-2">
                <button onClick={() => setOpenSection(isOpen ? "" : categoryId)} className="flex items-center gap-2 font-semibold text-sm"><span>{isOpen ? "\u25B2" : "\u25BC"}</span><span>{category.category_name}</span></button>
                <button type="button" onClick={() => downloadExpenseReport(category.category_name, bills)} className="bg-black text-white p-2 rounded-lg hover:bg-gray-800 transition-all duration-300" aria-label={`Download ${category.category_name} expense report`}><FaDownload /></button>
              </div>
              {isOpen && <><div className="text-right text-xs text-gray-500 mb-2">{bills.length} bills · {money(totals.total)}</div><ExpenseAuditTable bills={bills} /></>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
