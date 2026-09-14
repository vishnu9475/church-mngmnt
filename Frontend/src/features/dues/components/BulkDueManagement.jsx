import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import CreateBulkDue from "./CreateBulkDue";
import {
  getBulkDueCollections,
  getCategories,
  getDues,
  getFamilies,
  getBulkDueCollectionsPage,
} from "../../../data/dataService";
import PaginationControls from "../../../components/common/PaginationControls";

const PAGE_SIZE = 25;

function BulkDueManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [collections, setCollections] = useState([]);
  const [allCollections, setAllCollections] = useState(() => getBulkDueCollections());
  const [totalCount, setTotalCount] = useState(0);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [page, setPage] = useState(1);

  const refreshCollections = () => {
    setAllCollections(getBulkDueCollections());
    setPage(1);
    setIsCreateOpen(false);
  };

  const dueCount = (collectionId) =>
    getDues().filter((due) => due.collection_id === collectionId).length;

  const collectionTotal = (collection) => Number(collection.amount_per_family || 0) * Number(collection.family_count ?? dueCount(collection.collection_id));

  const categoryName = (categoryId) =>
    getCategories("Due").find((category) => category.category_id === categoryId)
      ?.category_name || "Uncategorized";

  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: new Date(2000, index, 1).toLocaleString("en-IN", { month: "long" }),
  }));

  const collectionYear = (collection) =>
    String(collection.year || collection.due_date?.slice(0, 4) || "");

  const collectionMonth = (collection) =>
    collection.due_date ? String(Number(collection.due_date.slice(5, 7))) : "";

  const availableYears = [
    ...new Set(allCollections.map(collectionYear).filter(Boolean)),
  ].sort((first, second) => Number(second) - Number(first));

  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    let active = true;
    getBulkDueCollectionsPage({ page, pageSize: PAGE_SIZE, filters: { ...(selectedYear !== "all" ? { year: selectedYear } : {}), ...(selectedMonth !== "all" ? { due_date__month: selectedMonth } : {}) } })
      .then((response) => { if (active) { setCollections(response.results); setTotalCount(response.count); } })
      .catch(() => { if (active) { setCollections([]); setTotalCount(0); } });
    return () => { active = false; };
  }, [page, selectedYear, selectedMonth]);

  const money = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value) =>
    value
      ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 md:text-4xl">
            Bulk Dues Management
          </h1>
          <p className="text-base text-gray-500 md:text-lg">
            Create collection events for multiple families at once
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="rounded-2xl bg-black px-8 py-4 text-white transition hover:bg-gray-800"
            >
              + Create Bulk Due
            </button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto border border-[#D9D9D9] bg-white sm:max-h-[85vh] sm:max-w-md">
            <CreateBulkDue
              onCreated={refreshCollections}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <section className="mb-8 overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Created Bulk Due Collections
            </h2>
            <p className="text-sm text-gray-500">
              Filter collections by their due month and accounting year.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <select
              aria-label="Filter by year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="min-w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-black"
            >
              <option value="all">All years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="min-w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-black"
            >
              <option value="all">All months</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <p className="w-full text-sm text-gray-500 md:text-right">
              Showing {totalCount} collection{totalCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Collection</th>
                <th className="px-4 py-4 font-semibold">Category</th>
                <th className="px-4 py-4 text-right font-semibold">Amount / Family</th>
                <th className="px-4 py-4 text-center font-semibold">Families</th>
                <th className="px-4 py-4 text-right font-semibold">Total Due Amount</th>
                <th className="px-4 py-4 font-semibold">Due Date</th>
                <th className="px-5 py-4 font-semibold">Year</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {collections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-gray-500">
                    {totalCount === 0
                      ? "No bulk due collections have been created yet."
                      : "No bulk due collections match the selected year and month."}
                  </td>
                </tr>
              ) : (
                collections.map((collection) => (
                  <tr key={collection.collection_id} className="hover:bg-gray-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{collection.title}</p>
                      {collection.description && (
                        <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                          {collection.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {categoryName(collection.category_id)}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-gray-900">
                      {money(collection.amount_per_family)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                        {collection.family_count ?? dueCount(collection.collection_id)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-900">
                      {money(collectionTotal(collection))}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {formatDate(collection.due_date)}
                    </td>
                    <td className="px-5 py-4 text-gray-700">{collection.year || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 md:px-8">
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </div>
      </section>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 md:p-8">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">About Bulk Dues</h2>
        <p className="mb-8 text-lg leading-8 text-gray-600">
          Use this feature to create collection events that apply to multiple families at once,
          such as:
        </p>
        <ul className="mb-10 list-disc space-y-4 pl-8 text-lg text-gray-600">
          <li>Mission Sunday collections</li>
          <li>Building fund contributions</li>
          <li>Special church events</li>
          <li>Annual membership fees</li>
        </ul>
        <div className="rounded-2xl bg-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">
            Total Families: {getFamilies().length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default BulkDueManagement;
