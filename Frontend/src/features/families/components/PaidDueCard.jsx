import { FaEdit, FaTrash } from "react-icons/fa";

const formatDate = (value) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    })
  : "—";

const formatAuditDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const PaidDueCard = ({
  title,
  amount,
  paymentDate,
  paymentMethod,
  editCount = 0,
  lastEditedAt,
  previousAmount,
  lastEditedBy,
  onEdit,
  onDelete,
}) => {
  const hasAudit = Number(editCount) > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-gray-800">{title}</h2>
            <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Recorded</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <p>Date: {formatDate(paymentDate)}</p>
            <p>Method: {paymentMethod}</p>
          </div>

          {hasAudit && (
            <section className="mt-4 rounded-lg border border-amber-100 bg-amber-50/70 p-3" aria-label="Payment edit audit">
              <div className="grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                <p><span className="font-medium text-gray-700">Edited:</span> {editCount} {Number(editCount) === 1 ? "time" : "times"}</p>
                <p><span className="font-medium text-gray-700">Last edit:</span> {formatAuditDateTime(lastEditedAt)}</p>
                <p><span className="font-medium text-gray-700">Previous amount:</span> {money(previousAmount)}</p>
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <p className="text-xl font-bold text-green-600">{money(amount)}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onEdit} className="rounded-lg border border-blue-200 p-2 text-blue-700 hover:bg-blue-50" aria-label={`Edit payment for ${title}`}><FaEdit size={14} /></button>
            <button type="button" onClick={onDelete} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" aria-label={`Delete payment for ${title}`}><FaTrash size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaidDueCard;
