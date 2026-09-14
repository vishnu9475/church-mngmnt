import MonthlyBills from "./MonthlyBills";
import PaginationControls from "../../../components/common/PaginationControls";

export default function AllBills({
  groupedBills,
  onEditBill,
  onDeleteBill,
  search,
  onSearchChange,
  page,
  pageSize,
  totalCount,
  onPageChange,
  isLoading = false,
  error = "",
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 sm:px-4">
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search bills by title, vendor, category, or voucher number..."
          className="w-full text-sm text-gray-600 outline-none placeholder:text-gray-400"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-3" aria-busy={isLoading}>
        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Loading bills…
          </div>
        ) : groupedBills.length > 0 ? (
          groupedBills.map((group) => (
            <MonthlyBills
              key={group.month}
              month={group.month}
              bills={group.bills}
              onEditBill={onEditBill}
              onDeleteBill={onDeleteBill}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-gray-700">No bills found</h2>
            <p className="mt-2 text-sm text-gray-400">
              Try searching another title, vendor, category, or voucher number.
            </p>
          </div>
        )}
      </div>

      <PaginationControls
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
      />
    </div>
  );
}
