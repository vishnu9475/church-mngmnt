import { Pencil, Trash2 } from "lucide-react";

function Receipt_Card({ receipts, onEditReceipt , onDeleteReceipt }){

const data = receipts;
const formatLastEdited = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAmount = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? `₹${numericValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Not available";
};

  if (!data.length) {
    return (
      <div className="text-center py-12 border border-dashed border-gray-300 rounded-3xl text-gray-500 bg-white">
        No receipts found
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {data.map((receipt) => (

        <div
         key={receipt.receiptNo}
          className="border border-gray-200 rounded-3xl bg-white px-5 py-4 hover:border-gray-300 transition-all"
        >

         <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

            <div className="flex-1 min-w-0">

              <div className="flex flex-wrap items-center gap-2">

              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">
                  {receipt.title}
                </h2>

                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-medium">
                  {receipt.receiptNo}
                </span>

                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[10px] font-medium">
                  {receipt.paymentMethod}
                </span>

              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs sm:text-sm text-gray-600">

                <p>
                  Payer:
                  <span className="font-medium ml-1">
                    {receipt.payer}
                  </span>
                </p>

                <span className="text-gray-300">•</span>
<p>
  Category:
  <span className="font-medium ml-1">
    {receipt.categories
      ?.map((item) => item.category)
      .join(", ")}
  </span>
</p>

                <span className="text-gray-300">•</span>

                <p>
                  Date:
                  <span className="font-medium ml-1">
                    {new Date(receipt.date).toLocaleDateString("en-GB")}
                  </span>
                </p>
                

              </div>
{receipt.categories?.some(
  (item) => item.category === "Monthly Collection"
) && (
    <div className="mt-3">
      {receipt.fromMonth && receipt.toMonth ? <span className="inline-flex items-center rounded-md bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
        {receipt.fromMonth && receipt.toMonth ? <>Period:{" "}
        {new Date(receipt.fromMonth + "-01").toLocaleString(
          "default",
          {
            month: "short",
            year: "numeric",
          }
        )}{" "}
        -{" "}
        {new Date(receipt.toMonth + "-01").toLocaleString(
          "default",
          {
            month: "short",
            year: "numeric",
          }
        )}</> : null}
      </span> : <button
        type="button"
        onClick={() => onEditReceipt(receipt)}
        className="inline-flex items-center rounded-md bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200"
      >
        Set Monthly Collection Period
      </button>}
    </div>
  )}

             <p className="mt-3 text-xs sm:text-sm text-gray-500 leading-relaxed">
                {receipt.description}
              </p>

              {Number(receipt.editCount) > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-2 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-xs text-gray-600 sm:grid-cols-3 sm:gap-4">
                  <p><span className="font-medium text-gray-700">Edited:</span> {receipt.editCount} {Number(receipt.editCount) === 1 ? "time" : "times"}</p>
                  <p><span className="font-medium text-gray-700">Last edit:</span> {formatLastEdited(receipt.lastEditedAt)}</p>
                  <p><span className="font-medium text-gray-700">Previous amount:</span> {formatAmount(receipt.previousAmount)}</p>
                </div>
              )}

            </div>

            <div className="flex flex-col items-start lg:items-end justify-center w-full lg:w-auto">
             <h2 className="text-xl sm:text-2xl font-bold text-green-600 whitespace-nowrap">
              ₹{Number(receipt.amount).toFixed(2)}
              </h2>

             <div className="flex gap-2 mt-3 self-start lg:self-auto">

               
  <button 
    className="w-9 h-9 border border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-100"
    onClick={() => onEditReceipt(receipt)}  // 👈 add this
  >
    <Pencil className="w-4 h-4 text-gray-700" />
  </button>
                <button 
    className="w-9 h-9 border border-gray-300 rounded-xl flex items-center justify-center hover:bg-red-50"
    onClick={() => onDeleteReceipt(receipt.id)}
  >
    <Trash2 className="w-4 h-4 text-red-500" />
  </button>

              </div>

            </div>

          </div>

        </div>

      ))}

    </div>
  );
}

export default Receipt_Card;
