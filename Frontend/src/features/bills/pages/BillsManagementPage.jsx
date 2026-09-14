import { useEffect, useState } from "react";
import Sidemenu from "../../../components/common/Sidemenu";
import BillsManagement from "../components/BillsManagement";
import AllBills from "../components/AllBills";
import Addoreditbill from "../components/Addoreditbill";
import {
  getBillsPage,
  getCategories,
  getGroupedBillsByMonth,
  getPaymentMethods,
  initializeData,
} from "../../../data/dataService";
import { createBill, deleteBill, updateBill } from "../../../services/billService";

const PAGE_SIZE = 25;

const displayDate = (value) => {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const toInputDate = (value) => {
  const [day, month, year] = String(value || "").split("/");
  return year ? `${year}-${month}-${day}` : "";
};

const toBillCard = (bill) => ({
  id: bill.bill_id,
  title: bill.title,
  recordNumber: bill.institution_bill_number || bill.voucher_number,
  recordType: bill.bill_type,
  status: bill.status,
  vendor: bill.vendor,
  category: bill.category_name || "Uncategorized",
  paymentMethod: bill.payment_method_name || "",
  dueDate: displayDate(bill.due_date),
  description: bill.description || "",
  amount: `₹${Number(bill.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  editCount: Number(bill.edit_count || 0),
  lastEditedAt: bill.last_edited_at || null,
  previousAmount: bill.previous_amount == null ? null : Number(bill.previous_amount),
  lastEditedBy: bill.last_edited_by || null,
  previousPaymentMethod: bill.previous_payment_method || null,
});

const groupBillCards = (rows) => {
  const groups = new Map();
  rows.forEach((row) => {
    const bill = toBillCard(row);
    const month = new Date(`${row.bill_date || row.due_date}T00:00:00`)
      .toLocaleString("en-US", { month: "long", year: "numeric" });
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(bill);
  });
  return [...groups.entries()].map(([month, bills]) => ({ month, bills }));
};

export default function BillsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [summaryGroups, setSummaryGroups] = useState(() => getGroupedBillsByMonth());
  const [groupedBills, setGroupedBills] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const loadBills = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await getBillsPage({ page, pageSize: PAGE_SIZE, search });
        if (!active) return;
        setGroupedBills(groupBillCards(response.results));
        setTotalCount(response.count);
      } catch (error) {
        if (active) setLoadError(`Could not load bills: ${error.message}`);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadBills();
    return () => { active = false; };
  }, [page, search, refreshVersion]);

  const summaryBills = summaryGroups.flatMap((group) => group.bills);
  const pageBills = groupedBills.flatMap((group) => group.bills);

  const refreshAfterWrite = async () => {
    await initializeData();
    setSummaryGroups(getGroupedBillsByMonth());
    setPage(1);
    setRefreshVersion((version) => version + 1);
  };

  const handleEditBill = (bill) => {
    setSelectedBill({
      id: bill.id,
      billType: bill.recordType === "Voucher" ? "Voucher (System Generated)" : "Bill (From Institution)",
      title: bill.title,
      vendor: bill.vendor,
      amount: String(bill.amount || "").replace(/,/g, "").replace(/[^\d.-]/g, ""),
      dueDate: toInputDate(bill.dueDate),
      category: bill.category,
      paymentMethod: bill.paymentMethod,
      status: bill.status,
      description: bill.description,
      editCount: bill.editCount || 0,
      lastEditedAt: bill.lastEditedAt || null,
      previousAmount: bill.previousAmount,
      lastEditedBy: bill.lastEditedBy || null,
      previousPaymentMethod: bill.previousPaymentMethod || null,
    });
    setModalOpen(true);
  };

  const handleSubmitBill = async (billData) => {
    const category = getCategories("Bill").find((item) => item.category_name === billData.category);
    const paymentMethod = billData.status === "Paid"
      ? getPaymentMethods().find((item) => item.method_name === billData.paymentMethod)
      : getPaymentMethods()[0];

    if (!category || !paymentMethod) {
      window.alert("A bill category and payment method must exist before saving a bill.");
      return;
    }

    const payload = {
      bill_type: billData.billType === "Voucher (System Generated)" ? "Voucher" : "Bill",
      title: billData.title,
      vendor: billData.vendor,
      amount: Number(billData.amount),
      bill_date: billData.dueDate,
      due_date: billData.dueDate,
      category: category.category_id,
      payment_method: paymentMethod.payment_method_id,
      status: billData.status,
      description: billData.description,
    };

    try {
      if (selectedBill) {
        await updateBill(selectedBill.id, payload);
      } else {
        await createBill(payload);
      }
      await refreshAfterWrite();
      setModalOpen(false);
      setSelectedBill(null);
    } catch (error) {
      window.alert(`Could not save bill: ${error.message}`);
    }
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm("Delete this bill?")) return;
    try {
      await deleteBill(billId);
      await refreshAfterWrite();
    } catch (error) {
      window.alert(`Could not delete bill: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidemenu />
      <main className="lg:ml-58 space-y-8 p-4 md:p-6 lg:p-8">
        <BillsManagement bills={summaryBills} onAddBill={() => { setSelectedBill(null); setModalOpen(true); }} />
        <AllBills
          groupedBills={groupedBills}
          onEditBill={handleEditBill}
          onDeleteBill={handleDeleteBill}
          search={search}
          onSearchChange={(value) => { setSearch(value); setPage(1); }}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          onPageChange={setPage}
          isLoading={isLoading}
          error={loadError}
        />
        <Addoreditbill
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedBill(null); }}
          onSubmit={handleSubmitBill}
          billData={selectedBill}
        />
      </main>
    </div>
  );
}
