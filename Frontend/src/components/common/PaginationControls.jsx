import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PaginationControls({
  page = 1,
  pageSize = 25,
  totalCount = 0,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  if (!totalCount) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);
  const visiblePages = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (pageNumber) =>
      pageNumber === 1 ||
      pageNumber === totalPages ||
      Math.abs(pageNumber - currentPage) <= 1,
  );

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-center text-sm text-gray-600 sm:text-left">
        Showing <span className="font-semibold">{start}</span>-<span className="font-semibold">{end}</span> of{" "}
        <span className="font-semibold">{totalCount}</span> records
      </p>

      <div className="flex w-full flex-wrap items-center justify-center gap-1 sm:w-auto sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        {visiblePages.map((pageNumber, index) => (
          <span key={pageNumber} className="flex items-center gap-1">
            {index > 0 && visiblePages[index - 1] !== pageNumber - 1 && (
              <span className="px-1 text-gray-400">...</span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`min-w-9 rounded-lg px-3 py-2 text-sm font-medium transition ${
                pageNumber === currentPage
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {pageNumber}
            </button>
          </span>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
