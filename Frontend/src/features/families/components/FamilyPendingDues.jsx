import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import TotalPendingCard from "./TotalPendingCard";
import PendingDueCard from "./PendingDueCard";
import AddEditNewDue from "./AddEditNewDue";
import FamilyDuePayment from "../../dues/components/FamilyDuePayment";
import { apiRequest, getCategories, getDuePayments, getFamilyById, getPendingDuesForFamily, initializeData, syncMonthlyCollectionPendingDue } from "../../../data/dataService";
import PaginationControls from "../../../components/common/PaginationControls";

const PAGE_SIZE = 10;

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// jsPDF's built-in Helvetica font cannot reliably render the Unicode rupee
// glyph. Use an explicit ASCII INR prefix in the exported audit document.
const pdfMoney = (amount) => `INR ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const displayDate = (date) => date ? new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const FamilyPendingDues = ({ familyId = 4 }) => {
  const [pendingDues, setPendingDues] = useState(() => getPendingDuesForFamily(familyId));
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState(null);
  const [page, setPage] = useState(1);
  const family = getFamilyById(Number(familyId));

  useEffect(() => {
    let active = true;
    const syncLinkedMonthlyDue = async () => {
      try {
        await syncMonthlyCollectionPendingDue(familyId, family?.monthly_dues_start_month);
      } catch (error) {
        console.error("Could not sync monthly pending due", error);
      }
      if (active) setPendingDues(getPendingDuesForFamily(familyId));
    };
    syncLinkedMonthlyDue();
    setDraftSearch(""); setSearch("");
    return () => { active = false; };
  }, [familyId]);

  const payments = useMemo(() => {
    const dueById = new Map(pendingDues.map((due) => [Number(due.id), due]));
    return getDuePayments().filter((payment) => dueById.has(Number(payment.due_id)))
      .map((payment) => ({ ...payment, due: dueById.get(Number(payment.due_id)) }))
      .sort((first, second) => new Date(second.payment_date || 0) - new Date(first.payment_date || 0));
  }, [pendingDues]);
  const lastPayment = payments[0] || null;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleDues = pendingDues.filter((due) => !normalizedSearch || [due.title, due.category, due.status, due.dueDate, due.description]
    .some((value) => String(value || "").toLowerCase().includes(normalizedSearch)));
  const allPending = pendingDues.reduce((total, due) => total + Number(due.remaining || 0), 0);
  const filteredPending = visibleDues.reduce((total, due) => total + Number(due.remaining || 0), 0);
  useEffect(() => {
    setPage(1);
  }, [search, pendingDues.length, familyId]);
  const totalPages = Math.max(1, Math.ceil(visibleDues.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedDues = visibleDues.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const refreshDues = async () => {
    await initializeData();
    await syncMonthlyCollectionPendingDue(familyId, family?.monthly_dues_start_month);
    setPendingDues(getPendingDuesForFamily(familyId));
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this due and its recorded payment history?")) return;
    try { await apiRequest(`dues/${id}/`, { method: "DELETE" }); await refreshDues(); }
    catch (error) { window.alert(`Could not delete due: ${error.message}`); }
  };
  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFontSize(16); doc.text("Family Dues & Expected Payments", 14, 18);
    doc.setFontSize(10); doc.text(`Family: ${family?.family_name || "Family"}`, 14, 25);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 31);
    autoTable(doc, {
      startY: 37,
      margin: { left: 14, right: 14 },
      tableWidth: 182,
      head: [["Total Pending", "Last Paid Amount", "Last Paid Date", "Last Payment Category"]],
      body: [[pdfMoney(allPending), lastPayment ? pdfMoney(lastPayment.amount) : "No payment", displayDate(lastPayment?.payment_date), lastPayment?.due?.category || "No payment recorded"]],
      theme: "grid",
      styles: { halign: "center", valign: "middle", fontSize: 8.5, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [31, 41, 55], halign: "center", valign: "middle", fontStyle: "bold" },
      bodyStyles: { halign: "center", valign: "middle", fontStyle: "bold" },
      // Equal-width columns guarantee each heading is centred over its value.
      columnStyles: { 0: { cellWidth: 45.5 }, 1: { cellWidth: 45.5 }, 2: { cellWidth: 45.5 }, 3: { cellWidth: 45.5 } },
    });
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Due", "Category", "Due Date", "Total", "Paid", "Remaining", "Status"]],
      body: visibleDues.map((due) => [due.title, due.category, due.dueDate, pdfMoney(due.totalAmount), pdfMoney(due.paid), pdfMoney(due.remaining), due.status]),
      theme: "striped",
      styles: { fontSize: 8, valign: "middle" },
      headStyles: { fillColor: [22, 101, 52], valign: "middle" },
      // Numeric headings and values share the exact same centre point.
      didParseCell: (data) => {
        if ([3, 4, 5].includes(data.column.index)) data.cell.styles.halign = "center";
      },
    });
    doc.save(`${(family?.family_name || "family").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-dues-report.pdf`);
  };

  return <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 className="text-lg font-semibold">Family Dues & Expected Payments</h2><div className="flex flex-wrap gap-2"><button type="button" onClick={downloadPdf} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">Download PDF</button><button type="button" onClick={() => { setSelectedDue(null); setIsOpen(true); }} className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90">+ Add Due</button></div></div>
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-lg border border-red-100 bg-red-50 p-3"><p className="text-xs font-medium text-red-700">Pending dues</p><p className="mt-1 text-lg font-bold text-red-900">{money(allPending)}</p></div><div className="rounded-lg border border-green-100 bg-green-50 p-3"><p className="text-xs font-medium text-green-700">Last paid amount</p><p className="mt-1 text-lg font-bold text-green-900">{lastPayment ? money(lastPayment.amount) : "No payments"}</p></div><div className="rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="text-xs font-medium text-blue-700">Last payment date</p><p className="mt-1 text-sm font-bold text-blue-900">{displayDate(lastPayment?.payment_date)}</p></div><div className="rounded-lg border border-violet-100 bg-violet-50 p-3"><p className="text-xs font-medium text-violet-700">Last payment category</p><p className="mt-1 text-sm font-bold text-violet-900">{lastPayment?.due?.category || "No payment recorded"}</p></div></div>
    <div className="mb-4 flex flex-col gap-2 sm:flex-row"><input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setSearch(draftSearch); }} placeholder="Search dues by title, category, status, or date" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-700" /><button type="button" onClick={() => setSearch(draftSearch)} className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-medium text-white hover:bg-black">Search</button>{search && <button type="button" onClick={() => { setDraftSearch(""); setSearch(""); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Clear</button>}</div>
    <TotalPendingCard amount={filteredPending} />
    <div className="mt-4 space-y-4">{visibleDues.length ? paginatedDues.map((due) => <PendingDueCard key={due.id} due={due} onEdit={() => { setSelectedDue(due); setIsOpen(true); }} onPay={() => { setSelectedDue(due); setIsPaymentOpen(true); }} onDelete={() => handleDelete(due.id)} />) : <p className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">No dues match this search.</p>}</div>
    <div className="mt-4"><PaginationControls page={currentPage} pageSize={PAGE_SIZE} totalCount={visibleDues.length} onPageChange={setPage} /></div>
    <AddEditNewDue isOpen={isOpen} setIsOpen={setIsOpen} addDue={async (newDue) => { const category = getCategories("Due").find((item) => item.category_name === newDue.category); if (!category) throw new Error("Select a valid Due category."); const payload = { family: Number(familyId), title: newDue.title, amount: Number(newDue.amount), due_date: newDue.dueDate, year: Number(newDue.year), category: category.category_id, description: newDue.description }; if (selectedDue) await apiRequest(`dues/${selectedDue.id}/`, { method: "PATCH", body: JSON.stringify(payload) }); else await apiRequest("dues/", { method: "POST", body: JSON.stringify(payload) }); await refreshDues(); setSelectedDue(null); }} editDue={selectedDue} dueCategories={getCategories("Due")} />
    <FamilyDuePayment isOpen={isPaymentOpen} setIsOpen={setIsPaymentOpen} due={selectedDue} familyId={familyId} onPayment={refreshDues} />
  </div>;
};

export default FamilyPendingDues;
