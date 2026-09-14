import { useState } from "react";
import { X } from "lucide-react";
import { getCategories, getMonthlyDueAmount, getMonthlyAmountsBySlug, getPaymentMethods, getPayerOptions, getReceiptsFormatted, initializeData } from "../../../data/dataService";
import { updateReceipt } from "../../../services/receiptService";

const MONTHLY_PERIOD_PATTERN = /^\[Monthly collection period: (\d{4}-\d{2}) to (\d{4}-\d{2})(?:; monthly amount: \d+(?:\.\d+)?)?\]\s*/;

const readMonthlyPeriod = (description) => {
  const match = String(description || "").match(MONTHLY_PERIOD_PATTERN);
  return match ? { from: match[1], to: match[2] } : null;
};

const removeMonthlyPeriod = (description) => String(description || "").replace(MONTHLY_PERIOD_PATTERN, "").trim();

const monthlyPeriodTotal = (familyId, fromMonth, toMonth) => {
  if (!familyId || !fromMonth || !toMonth) return 0;
  const cursor = new Date(`${fromMonth}-01T00:00:00`);
  const end = new Date(`${toMonth}-01T00:00:00`);
  let total = 0;
  while (cursor <= end) {
    total += getMonthlyDueAmount(familyId, `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return total;
};

const formatAuditDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const formatRupees = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? `₹${numericValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Not available";
};

const saveMonthlyPeriod = (description, fromMonth, toMonth, monthlyAmount) =>
  `[Monthly collection period: ${fromMonth} to ${toMonth}; monthly amount: ${Number(monthlyAmount || 0).toFixed(2)}]${String(description || "").trim() ? `\n${String(description || "").trim()}` : ""}`;

const inferMonthlyPeriod = (receipt) => {
  const isMonthlyReceipt = Array.isArray(receipt?.categories) && receipt.categories.some((item) => item.category === "Monthly Collection");
  const monthlyAmount = getMonthlyAmountsBySlug()[receipt?.payerValue] || 0;
  const monthCount = Math.round(Number(receipt?.amount || 0) / monthlyAmount);
  if (!isMonthlyReceipt || !monthlyAmount || !Number.isInteger(monthCount) || monthCount < 1 || !receipt?.date) return null;

  const end = new Date(`${receipt.date.slice(0, 7)}-01T00:00:00`);
  const start = new Date(end.getFullYear(), end.getMonth() - monthCount + 1, 1);
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return { from: format(start), to: format(end) };
};

const countMonths = (fromMonth, toMonth) => {
  if (!fromMonth || !toMonth) return 0;
  const start = new Date(`${fromMonth}-01T00:00:00`);
  const end = new Date(`${toMonth}-01T00:00:00`);
  const value = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
  return value > 0 ? value : 0;
};

export default function EditReceipt({
  receipt,
  setReceipts,
  onClose,
}) {
if (!receipt) return null;
// Pulled live from the families table via dataService.
const PAYER_OPTIONS = getPayerOptions();
const PREDEFINED_PAYER_VALUES = PAYER_OPTIONS
  .map((p) => p.value)
  .filter((v) => v !== "other");
// Older receipts did not store the range. When their amount is an exact
// multiple of the family's monthly amount, prefill a best-effort range ending
// in the receipt month; saving the edit records the exact range going forward.
const storedMonthlyPeriod = (receipt?.fromMonth && receipt?.toMonth
  ? { from: receipt.fromMonth, to: receipt.toMonth }
  : null) || readMonthlyPeriod(receipt?.description) || inferMonthlyPeriod(receipt);

const [form, setForm] = useState({
  title: receipt?.title || "",

  payer: PREDEFINED_PAYER_VALUES.includes(receipt?.payerValue)
    ? receipt.payerValue
    : "other",

  customPayer: PREDEFINED_PAYER_VALUES.includes(receipt?.payerValue)
    ? ""
    : receipt?.payer || "",

  category:
    receipt?.categories?.[0]?.category || "",

  amount:
    receipt?.categories?.[0]?.amount || "",

  receiptDate: receipt?.date || "",

  paymentMethod:
    receipt?.paymentMethod === "Check" ? "Cheque" : receipt?.paymentMethod || "",

  description:
    removeMonthlyPeriod(receipt?.description || ""),
});

const [fromMonth, setFromMonth] = useState(storedMonthlyPeriod?.from || "");
const [toMonth, setToMonth] = useState(storedMonthlyPeriod?.to || "");

const PAYERS = PAYER_OPTIONS;
  // Read current database-backed categories on every render. This keeps the
  // edit form aligned with additions made in Category Management.
  const receiptCategories = getCategories("Receipt")
    .filter((item) => item.category_name)
    .sort((first, second) => String(first.category_name).localeCompare(String(second.category_name)));

  const [errors, setErrors] = useState({});
  const monthlyAmount = getMonthlyAmountsBySlug()[form.payer] || 0;
  const monthCount = countMonths(fromMonth, toMonth);
  const isMonthlyAutoCalculated = form.category === "Monthly Collection" && form.payer !== "other" && monthCount > 0;
  const selectedPayer = PAYERS.find((payer) => payer.value === form.payer);
  const scheduledMonthlyTotal = monthlyPeriodTotal(selectedPayer?.familyId, fromMonth, toMonth);
  const updatedAmount = isMonthlyAutoCalculated ? scheduledMonthlyTotal : Number(form.amount || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });
  };

  const validate = () => {
    let newErrors = {};

    if (!form.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!form.payer) {
      newErrors.payer = "Payer is required";
    }

    if (!form.category) {
      newErrors.category = "Category is required";
    }

    if (!form.amount) {
      newErrors.amount = "Amount is required";
    }

    if (form.category === "Monthly Collection" && form.payer !== "other" && ((fromMonth && !toMonth) || (!fromMonth && toMonth) || (fromMonth && toMonth && monthCount === 0))) {
      newErrors.monthRange = "Select a valid From and To month.";
    }

    if (!form.receiptDate) {
      newErrors.receiptDate = "Receipt date is required";
    }

    if (!form.paymentMethod) {
      newErrors.paymentMethod = "Payment method is required";
    }
    if (
  form.payer === "other" &&
  !form.customPayer.trim()
) {
  newErrors.customPayer =
    "Custom payer name is required";
}
    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };
const handleUpdate = async () => {
  if (!validate()) return;
  try {
    const payer = PAYERS.find((item) => item.value === form.payer);
    const category = getCategories('Receipt').find((item) => item.category_name === form.category);
    const paymentMethod = getPaymentMethods().find((item) => item.method_name === form.paymentMethod);
    const isFamilyPayer = Boolean(payer?.familyId);
    const savedDescription = isMonthlyAutoCalculated
      ? saveMonthlyPeriod(form.description, fromMonth, toMonth, scheduledMonthlyTotal)
      : form.description;
    await updateReceipt(receipt.id, { title: form.title, family: isFamilyPayer ? payer.familyId : null, other_payer_name: isFamilyPayer ? null : form.customPayer.trim(), primary_category: category?.category_id, amount: updatedAmount, receipt_date: form.receiptDate, payment_method: paymentMethod?.payment_method_id, description: savedDescription });
    await initializeData();
    setReceipts(getReceiptsFormatted());
  } catch (error) {
    alert(`Could not update receipt: ${error.message}`);
    return;
  }

  onClose();
};

  const currentAmount = 2500;
  const newTotal = updatedAmount;

  return (
    <>
     
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
        <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">
              Edit Receipt
            </h2>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition"
            >
              <X size={18} />
            </button>
          </div>

          {Number(receipt.editCount) > 0 && (
            <div className="mb-5 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-xs text-gray-600">
              <p className="font-semibold text-gray-800">Receipt edit audit</p>
              <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-3">
                <p>Edited: {receipt.editCount} {Number(receipt.editCount) === 1 ? "time" : "times"}</p>
                <p>Last edit: {formatAuditDateTime(receipt.lastEditedAt)}</p>
                <p>Previous amount: {formatRupees(receipt.previousAmount)}</p>
                {receipt.previousPaymentMethod && (
                  <p>Previous payment method: {receipt.previousPaymentMethod}</p>
                )}
                {receipt.lastEditedBy && <p>Edited by: {receipt.lastEditedBy}</p>}
              </div>
            </div>
          )}

          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Title <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className={`rounded-lg px-3 py-2 text-sm outline-none border transition
                ${
                  errors.title
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              />

              {errors.title && (
                <span className="text-red-500 text-xs">
                  {errors.title}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
  <label className="text-xs font-medium text-gray-500">
    Payer <span className="text-red-500">*</span>
  </label>

  <select
    name="payer"
    value={form.payer}
    onChange={handleChange}
    className={`rounded-lg px-3 py-2 text-sm outline-none border ${
      errors.payer
        ? "border-red-500 bg-red-50"
        : "border-gray-200 bg-gray-50"
    }`}
  >
    <option value="">Select payer</option>

    {PAYERS.map((payer) => (
      <option
        key={payer.value}
        value={payer.value}
      >
        {payer.label}
      </option>
    ))}
  </select>

  {errors.payer && (
    <span className="text-red-500 text-xs">
      {errors.payer}
    </span>
  )}

  {form.payer === "other" && (
    <>
      <input
        type="text"
        name="customPayer"
        value={form.customPayer}
        onChange={handleChange}
        placeholder="Enter custom payer name"
        className={`mt-2 rounded-lg px-3 py-2 text-sm outline-none border ${
          errors.customPayer
            ? "border-red-500 bg-red-50"
            : "border-gray-200 bg-gray-50"
        }`}
      />

      {errors.customPayer && (
        <span className="text-red-500 text-xs">
          {errors.customPayer}
        </span>
      )}
    </>
  )}
</div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Category <span className="text-red-500">*</span>
              </label>

             <select
  name="category"
  value={form.category}
  onChange={handleChange}
  className={`rounded-lg px-3 py-2 text-sm outline-none border ${
    errors.category
      ? "border-red-500 bg-red-50"
      : "border-gray-200 bg-gray-50"
  }`}
>
  <option value="">Select Category</option>
  {receiptCategories.map((item) => (
    <option key={item.category_id} value={item.category_name}>
      {item.category_name}
    </option>
  ))}
</select>
              {errors.category && (
                <span className="text-red-500 text-xs">
                  {errors.category}
                </span>
              )}
            </div>

            {form.category === "Monthly Collection" && form.payer !== "other" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:col-span-2">
                <p className="mb-2 text-xs font-semibold text-blue-800">Monthly Collection Period</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs text-gray-600">From Month
                    <input type="month" value={fromMonth} onChange={(event) => setFromMonth(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm" />
                  </label>
                  <label className="text-xs text-gray-600">To Month
                    <input type="month" value={toMonth} onChange={(event) => setToMonth(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm" />
                  </label>
                </div>
                {errors.monthRange && <p className="mt-2 text-xs text-red-600">{errors.monthRange}</p>}
                {monthCount > 0 && <p className="mt-2 text-xs font-medium text-blue-800">{monthCount} month(s) · Scheduled monthly dues total: ₹{updatedAmount.toFixed(2)}</p>}
              </div>
            )}

            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Amount <span className="text-red-500">*</span>
              </label>

              <input
                type="number"
                name="amount"
                value={isMonthlyAutoCalculated ? updatedAmount : form.amount}
                onChange={handleChange}
                readOnly={isMonthlyAutoCalculated}
                className={`rounded-lg px-3 py-2 text-sm outline-none border
                ${
                  errors.amount
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              />

              {errors.amount && (
                <span className="text-red-500 text-xs">
                  {errors.amount}
                </span>
              )}

              
              <div className="bg-purple-50 rounded-lg px-3 py-2 mt-1 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-purple-600 font-medium">
                    {form.category}
                  </span>

                  <span className="text-purple-400">
                    Current
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-purple-400">
                    Category:
                  </span>

                  <span className="text-purple-600">
                    ₹{currentAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-purple-400">
                    New Total:
                  </span>

                  <span className="text-purple-700 font-semibold">
                    ₹{newTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Receipt Date <span className="text-red-500">*</span>
              </label>

              <input
                type="date"
                name="receiptDate"
                value={form.receiptDate}
                onChange={handleChange}
                className={`rounded-lg px-3 py-2 text-sm outline-none border
                ${
                  errors.receiptDate
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              />

              {errors.receiptDate && (
                <span className="text-red-500 text-xs">
                  {errors.receiptDate}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
  <label className="text-xs font-medium text-gray-500">
    Payment Method <span className="text-red-500">*</span>
  </label>

  <select
    name="paymentMethod"
    value={form.paymentMethod}
    onChange={handleChange}
    className={`rounded-lg px-3 py-2 text-sm outline-none border ${
      errors.paymentMethod
        ? "border-red-500 bg-red-50"
        : "border-gray-200 bg-gray-50"
    }`}
  >
    <option value="">Select Payment Method</option>
    {getPaymentMethods().map((method) => (
      <option key={method.payment_method_id} value={method.method_name}>
        {method.method_name}
      </option>
    ))}
  </select>

  {errors.paymentMethod && (
    <span className="text-red-500 text-xs">
      {errors.paymentMethod}
    </span>
  )}
</div>

            
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-gray-500">
                Description
              </label>

              <textarea
                rows={3}
                name="description"
                value={form.description}
                onChange={handleChange}
                className="rounded-lg px-3 py-2 text-sm outline-none border border-gray-200 bg-gray-50 resize-none"
              />
            </div>
          </div>

         
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleUpdate}
              className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-xl py-2.5 transition"
            >
              Update Receipt
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 sm:w-auto"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
