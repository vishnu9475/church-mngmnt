import { useEffect, useMemo, useState } from "react";
import Sidemenu from "../../../components/common/Sidemenu";
import ReceiptsManagement from "../components/ReceiptsManagement";
import Analysis_Card from "../components/ReceiptAnalysisCard";
import AddReceipt from "../components/AddReceipt";
import All_Receipts from "../components/AllReceipts";
import EditReceipt from "../components/EditReceipt";
import { getFamilyById, getPayerOptions, getReceiptsFormatted, getReceiptsPage, initializeData } from "../../../data/dataService";
import { deleteReceipt } from "../../../services/receiptService";

const PAGE_SIZE = 25;
const MONTHLY_PERIOD_PATTERN = /^\[Monthly collection period: (\d{4}-\d{2}) to (\d{4}-\d{2})(?:; monthly amount: (\d+(?:\.\d+)?))?\]\s*/;

const formatReceipt = (receipt) => {
  const family = receipt.family ? getFamilyById(receipt.family) : null;
  const payerOption = getPayerOptions().find((option) => Number(option.familyId) === Number(receipt.family));
  const descriptionWithMarker = String(receipt.description || "");
  const period = descriptionWithMarker.match(MONTHLY_PERIOD_PATTERN);
  const additionalCategories = (receipt.categories || [])
    .filter((item) => Number(item.category) !== Number(receipt.primary_category))
    .map((item) => ({ category: item.category_name, amount: 0 }));

  return {
    id: receipt.receipt_id,
    receiptNo: receipt.receipt_number,
    date: receipt.receipt_date,
    title: receipt.title,
    payer: family?.head_of_family || receipt.other_payer_name || receipt.family_name || "Unknown",
    payerValue: payerOption?.value || "other",
    familyId: receipt.family || null,
    paymentMethod: receipt.payment_method_name || "Not recorded",
    amount: Number(receipt.amount || 0),
    editCount: Number(receipt.edit_count || 0),
    lastEditedAt: receipt.last_edited_at || null,
    previousAmount: receipt.previous_amount == null ? null : Number(receipt.previous_amount),
    lastEditedBy: receipt.last_edited_by || null,
    previousPaymentMethod: receipt.previous_payment_method || null,
    description: descriptionWithMarker.replace(MONTHLY_PERIOD_PATTERN, "").trim(),
    fromMonth: period?.[1],
    toMonth: period?.[2],
    monthlyCollectionAmount: period?.[3] == null ? null : Number(period[3]),
    overdue: false,
    categories: [{ category: receipt.category_name || "Uncategorized", amount: Number(receipt.amount || 0) }, ...additionalCategories],
  };
};

function Page5() {
  const [showAddReceipt, setShowAddReceipt] = useState(false);
  const [showEditReceipt, setShowEditReceipt] = useState(false);
  const [summaryReceipts, setSummaryReceipts] = useState(() => getReceiptsFormatted());
  const [receipts, setReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedPayer, setSelectedPayer] = useState("All Payers");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const selectedFamilyId = useMemo(() => selectedPayer === "All Payers" ? "" : (summaryReceipts.find((receipt) => receipt.payer === selectedPayer)?.familyId || ""), [selectedPayer, summaryReceipts]);
  const refreshSummary = () => setSummaryReceipts(getReceiptsFormatted());

  useEffect(() => {
    let active = true;
    const loadReceipts = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await getReceiptsPage({
          page, pageSize: PAGE_SIZE, search,
          filters: { ...(selectedYear !== "All Years" ? { receipt_date__year: selectedYear } : {}), ...(selectedFamilyId ? { family: selectedFamilyId } : {}) },
        });
        if (!active) return;
        setReceipts(response.results.map(formatReceipt));
        setTotalCount(response.count);
      } catch (error) {
        if (active) { setReceipts([]); setTotalCount(0); setLoadError(error.message || "Could not load receipts."); }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadReceipts();
    return () => { active = false; };
  }, [page, search, selectedYear, selectedFamilyId]);

  const refreshAfterWrite = async () => {
    await initializeData();
    refreshSummary();
    setPage(1);
    const response = await getReceiptsPage({ page: 1, pageSize: PAGE_SIZE, search });
    setReceipts(response.results.map(formatReceipt));
    setTotalCount(response.count);
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm("Delete this receipt?")) return;
    try {
      await deleteReceipt(receiptId);
      await refreshAfterWrite();
    } catch (error) {
      window.alert(`Could not delete receipt: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidemenu />
      <main className="min-w-0 p-4 sm:p-6 lg:ml-58 lg:p-8"><div className="space-y-6">
          <ReceiptsManagement receipts={summaryReceipts} onAddReceipt={() => setShowAddReceipt(true)} />
          {summaryReceipts.length > 0 && <Analysis_Card receipts={summaryReceipts} />}
          <All_Receipts receipts={receipts} receiptOptions={summaryReceipts} onAddReceipt={() => setShowAddReceipt(true)} onEditReceipt={(receipt) => { setSelectedReceipt(receipt); setShowEditReceipt(true); }} onDeleteReceipt={handleDeleteReceipt} search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} selectedYear={selectedYear} onYearChange={(value) => { setSelectedYear(value); setPage(1); }} selectedPayer={selectedPayer} onPayerChange={(value) => { setSelectedPayer(value); setPage(1); }} page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} isLoading={isLoading} error={loadError} />
        </div></main>
      {showAddReceipt && <AddReceipt receipts={summaryReceipts} onClose={() => setShowAddReceipt(false)} setReceipts={refreshAfterWrite} />}
      {showEditReceipt && <EditReceipt receipt={selectedReceipt} setReceipts={refreshAfterWrite} onClose={() => { setShowEditReceipt(false); setSelectedReceipt(null); }} />}
    </div>
  );
}

export default Page5;
