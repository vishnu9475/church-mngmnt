import { useEffect, useRef, useState } from 'react';
import { getCategories, getMonthlyCollectionRows, getPaymentMethods, getPayerOptions, getMonthlyAmountsBySlug, getReceiptsFormatted, initializeData } from '../../../data/dataService';
import { addReceiptCategory, createReceipt } from '../../../services/receiptService';

// Store the monthly part separately because one receipt can also contain
// another category. The monthly dues tracker must never use that other amount.
const saveMonthlyPeriod = (description, fromMonth, toMonth, monthlyAmount) =>
  `[Monthly collection period: ${fromMonth} to ${toMonth}; monthly amount: ${Number(monthlyAmount || 0).toFixed(2)}]${description.trim() ? `\n${description.trim()}` : ""}`;

const monthlyPeriodTotal = (familyId, fromMonth, toMonth) => {
  if (!familyId || !fromMonth || !toMonth) return 0;
  return getMonthlyCollectionRows(familyId, fromMonth, toMonth)
    .reduce((total, row) => total + Number(row.pending || 0), 0);
};

const inputClass =
  'w-full px-3 py-2 border border-[#e5e7eb] bg-[#f9fafb] rounded-xl text-sm text-gray-900 placeholder-gray-400 transition outline-none focus:outline-none focus:border-gray-400 focus:bg-[#f3f4f6] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]';

const labelClass = 'block text-[14px] font-semibold text-black mb-1';

function Dropdown({
  value,
  onChange,
  placeholder,
  options,
  isObject = false,
  error = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  const selectedLabel = isObject
    ? options.find(item => item.value === value)?.label
    : value;

  
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${inputClass} ${
          error ? 'border-red-500' : ''
        } ${
          open ? 'border-gray-400 bg-[#f3f4f6] shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]' : ''
        } flex items-center justify-between text-left h-[36px]`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {selectedLabel || placeholder}
        </span>

        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {options.map((item, i) => {
            const optionValue = isObject ? item.value : item;
            const optionLabel = isObject ? item.label : item;

            return (
              <div
                key={i}
                onClick={() => {
                  onChange(optionValue);
                  setOpen(false);
                }}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  value === optionValue ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                {optionLabel}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AddReceipt({ onClose , setReceipts,receipts}) {
  // Read options when the form renders so categories added in Category
  // Management are available without a full browser refresh.
  const categories = getCategories('Receipt').map((c) => c.category_name);
  const paymentMethods = getPaymentMethods().map((m) => m.method_name);
  const monthlyAmounts = getMonthlyAmountsBySlug();
  const payers = getPayerOptions();
  const [form, setForm] = useState({
    title: '',
    payer: '',
    customPayer: '',
    primaryCategory: '',
    primaryAmount: '',
    receiptDate: '',
    paymentMethod: '',
    description: '',
  });
  
const [fromMonth, setFromMonth] = useState("");
const [toMonth, setToMonth] = useState("");
const [additionalCategories, setAdditionalCategories] = useState([]);
const [additionalAmounts, setAdditionalAmounts] = useState({});
const [errors, setErrors] = useState({});



const calculateMonths = () => {
  if (!fromMonth || !toMonth) return 0;

  const start = new Date(fromMonth);
  const end = new Date(toMonth);

  const diff =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;

  return diff > 0 ? diff : 0;
};

const months = calculateMonths();

const monthlyAmount =
  monthlyAmounts[form.payer] || 0;
const selectedFamilyId = payers.find((payer) => payer.value === form.payer)?.familyId;

  
  const isCustomPayer = form.payer === "other";

const hasMonthlyCollection =
  form.primaryCategory === "Monthly Collection" ||
  additionalCategories.includes("Monthly Collection");

const isAutoCalculated =
  hasMonthlyCollection &&
  !isCustomPayer &&
  fromMonth &&
  toMonth;

const isPrimaryAutoCalculated =
  form.primaryCategory === "Monthly Collection" && isAutoCalculated;
const monthlyCollectionTotal = isAutoCalculated ? monthlyPeriodTotal(selectedFamilyId, fromMonth, toMonth) : 0;
const selectedMonthlyRows = isAutoCalculated ? getMonthlyCollectionRows(selectedFamilyId, fromMonth, toMonth) : [];
const alreadyPaidMonths = selectedMonthlyRows.filter((row) => row.pending <= 0).length;
const alreadyPaidMonthLabels = selectedMonthlyRows.filter((row) => row.pending <= 0)
  .map((row) => new Date(`${row.month}-01T00:00:00`).toLocaleString("en-IN", { month: "short", year: "numeric" }));


  const primaryAmount = isPrimaryAutoCalculated
    ? monthlyCollectionTotal
    : Number(form.primaryAmount || 0);

  const additionalAmount = (category) => (
  category === "Monthly Collection" && isAutoCalculated
    ? monthlyCollectionTotal
      : Number(additionalAmounts[category] || 0)
  );

  // Keep the displayed additional-category amount in sync with the selected
  // monthly period. The saved total still uses `additionalAmount` above.
  useEffect(() => {
    if (!additionalCategories.includes("Monthly Collection")) return;

    setAdditionalAmounts((previous) => ({
      ...previous,
      "Monthly Collection": isAutoCalculated ? String(monthlyCollectionTotal) : "",
    }));
  }, [additionalCategories, isAutoCalculated, monthlyCollectionTotal]);
const handleAddReceipt = async () => {
  if (!validateForm()) return;

  try {
    const payer = payers.find((item) => item.value === form.payer);
    const category = getCategories('Receipt').find((item) => item.category_name === form.primaryCategory);
    const paymentMethod = getPaymentMethods().find((item) => item.method_name === form.paymentMethod);
    // The Django API assigns receipt_number from Settings atomically.
    const isFamilyPayer = Boolean(payer?.familyId);
    const savedDescription = hasMonthlyCollection && isAutoCalculated
      ? saveMonthlyPeriod(form.description, fromMonth, toMonth, monthlyCollectionTotal)
      : form.description;
    const created = await createReceipt({ family: isFamilyPayer ? payer.familyId : null, other_payer_name: isFamilyPayer ? null : form.customPayer.trim(), title: form.title, primary_category: category?.category_id, amount: totalAmount, receipt_date: form.receiptDate, payment_method: paymentMethod?.payment_method_id, description: savedDescription });
    await Promise.all(additionalCategories.map((name) => {
      const extra = getCategories('Receipt').find((item) => item.category_name === name);
      return extra ? addReceiptCategory(created.receipt_id, extra.category_id) : null;
    }));
    await initializeData();
    setReceipts(getReceiptsFormatted());
    onClose();
  } catch (error) {
    alert(`Could not save receipt: ${error.message}`);
  }
};

  const handleChange = e => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.title.trim()) newErrors.title = true;
    if (!form.payer) newErrors.payer = true;
    if (Number(form.primaryAmount) < 0) {
  newErrors.primaryAmount = true;
}
    if (!form.primaryCategory) newErrors.primaryCategory = true;
    if (
  form.primaryCategory !== "Monthly Collection" &&
  !form.primaryAmount
) {
  newErrors.primaryAmount = true;
}
    if (!form.receiptDate) newErrors.receiptDate = true;
    if (!form.paymentMethod) newErrors.paymentMethod = true;
   if (hasMonthlyCollection) {
  const hasPeriod = fromMonth && toMonth;
   if (!hasPeriod) newErrors.monthlyPeriod = true;
  if (hasPeriod && monthlyCollectionTotal <= 0) newErrors.monthlyPeriod = true;
}
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleAdditional = category => {
    setAdditionalCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );

    if (!(category in additionalAmounts)) {
  setAdditionalAmounts(prev => ({
    ...prev,
    [category]: '',
  }));
}
    if (category === "Monthly Collection" && additionalCategories.includes(category)) {
      setFromMonth("");
      setToMonth("");
    }
  };

 const additionalOptions = categories.filter(item => {
  if (item === form.primaryCategory) return false;

  if (
    form.payer === "other" &&
    item === "Monthly Collection"
  ) {
    return false;
  }

  return true;
});
const totalAmount =
  primaryAmount +
  additionalCategories.reduce(
    (sum, item) => sum + additionalAmount(item),
    0
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      {/* CARD - Form forced to precise 450px layout container matching the layout view */}
     <div className="bg-white rounded-2xl shadow-2xl w-[500px] max-w-[95vw] p-5 flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base text-[20px] font-semibold text-gray-950">
            Add New Receipt
          </h2>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto pr-0.5 flex-1 space-y-3.5">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <label className={labelClass}>
                Title <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g., Sunday Offering"
                className={`${inputClass} h-[44px] ${
                  errors.title ? 'border-red-500' : ''
                }`}
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label className={labelClass}>
                Payer <span className="text-red-500">*</span>
              </label>

            <Dropdown
  value={form.payer}
  onChange={value => {
    setForm(prev => ({
      ...prev,
      payer: value,
      primaryCategory:
        value === "other" &&
        prev.primaryCategory === "Monthly Collection"
          ? ""
          : prev.primaryCategory,
    }));

    if (value === "other") {
      setFromMonth("");
      setToMonth("");
      setAdditionalCategories(prev => prev.filter(item => item !== "Monthly Collection"));
    }
  }}
  placeholder="Select payer"
  options={payers}
  isObject
  error={errors.payer}
/>

              {form.payer === 'other' && (
                <input
                  type="text"
                  name="customPayer"
                  value={form.customPayer}
                  onChange={handleChange}
                  placeholder="Enter custom name"
                  className={`${inputClass} mt-1 h-[36px]`}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className={labelClass}>
              Primary Category <span className="text-red-500">*</span>
            </label>

          <Dropdown
  value={form.primaryCategory}
  onChange={value => {
    setForm({
      ...form,
      primaryCategory: value,
    });

    setAdditionalCategories(prev =>
      prev.filter(item => item !== value)
    );
    if (value !== "Monthly Collection" && !additionalCategories.includes("Monthly Collection")) {
      setFromMonth("");
      setToMonth("");
    }
  }}
  placeholder="Select primary category"
  options={
    form.payer === "other"
      ? categories.filter(
          category => category !== "Monthly Collection"
        )
      : categories
  }
  error={errors.primaryCategory}
/>
          </div>


          




  <div className="flex flex-col gap-0.5">
    <label className={labelClass}>
      Additional Categories (Optional)
    </label>

    <div className="border border-[#e5e7eb] rounded-xl p-3 bg-white space-y-2.5">
      {additionalOptions.map(category => {
        const checked =
          additionalCategories.includes(category);

        return (
          <div
            key={category}
            className="flex flex-col gap-1.5"
          >
            <label className="flex items-center gap-2.5 cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  toggleAdditional(category)
                }
                className="w-4 h-4 accent-black rounded border-gray-300"
              />

              <span className="text-xs font-semibold">
                {category}
              </span>
            </label>

            {checked && (
              <div className="pl-6.5 pb-0.5">
                <label className="block text-[10px] text-gray-400 mb-1">
                  {category === "Monthly Collection" ? "Monthly Collection Amount (fixed)" : `Amount for ${category} *`}
                </label>

                <input
  type="number"
  placeholder="0.00"
  min="0"
  value={category === "Monthly Collection" ? (isAutoCalculated ? additionalAmount(category) : monthlyAmount || "") : additionalAmounts[category] || ""}
  onChange={(e) => {
    if (category === "Monthly Collection") return;
    const value = e.target.value;
    

    if (Number(value) >= 0 || value === "") {
      setAdditionalAmounts(prev => ({
        ...prev,
        [category]: value,
      }));
    }
  }}
  onWheel={(e) => e.target.blur()}
  readOnly={category === "Monthly Collection"}
  className={`${inputClass} h-[32px] ${category === "Monthly Collection" ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
/>
                {category === "Monthly Collection" && <p className="mt-1 text-[10px] text-indigo-600">Select the From and To months below to calculate the collection.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>

  {hasMonthlyCollection &&
 !isCustomPayer &&
 monthlyAmount > 0 && (
  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
   <p className="text-sm font-medium text-sky-900">
  Monthly Collection Amount:
  <span className="ml-1 text-blue-900 font-semibold">
    ₹{monthlyAmount.toFixed(2)}
  </span>
</p>
  </div>
)}

  {hasMonthlyCollection &&
 !isCustomPayer && (
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
     <label className={labelClass}>
  From Date (Month/Year) *
</label>

      <input
        type="month"
        value={fromMonth}
        max={toMonth || undefined}
        onChange={(e) =>
          setFromMonth(e.target.value)
        }
        className={`${inputClass} ${errors.monthlyPeriod ? "border-red-500" : ""}`}
      />
    </div>

    <div><label className={labelClass}>
  To Date (Month/Year) *
</label>

      <input
        type="month"
        value={toMonth}
        min={fromMonth || undefined}
        onChange={(e) =>
          setToMonth(e.target.value)
        }
        className={`${inputClass} ${errors.monthlyPeriod ? "border-red-500" : ""}`}
      />
    </div>
  </div>
)}
{hasMonthlyCollection &&
 !isCustomPayer &&
 months > 0 && isPrimaryAutoCalculated && (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
     <p className="text-green-800">
  <span className="font-semibold">
    Period:
  </span>{" "}
  {months} month(s)
  {" | "}
  <span className="font-semibold">
    Auto-calculated Amount:
  </span>{" "}
  ₹{primaryAmount.toFixed(2)}
</p>
    </div>
)}

{hasMonthlyCollection &&
 !isCustomPayer &&
 !isPrimaryAutoCalculated &&
 months > 0 && (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
      <p className="text-green-800"><span className="font-semibold">Monthly Collection Period:</span> {months} month(s) <span className="font-semibold">| Pending amount to collect:</span> ₹{monthlyCollectionTotal.toFixed(2)}</p>
      {alreadyPaidMonths > 0 && <p className="mt-1 text-amber-700">Already paid and excluded: {alreadyPaidMonthLabels.join(", ")}.</p>}
      {errors.monthlyPeriod && monthlyCollectionTotal <= 0 && fromMonth && toMonth && <p className="mt-1 text-red-600">All selected months are already fully paid. Select another pending month.</p>}
    </div>
)}


          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <label className={labelClass}>Primary Category Amount *</label>
<input
  type="number"
  name="primaryAmount"
  min="0"
  value={
    isPrimaryAutoCalculated
      ? primaryAmount
      : form.primaryAmount
  }
  placeholder="0.00"
  onChange={handleChange}
  onWheel={(e) => e.preventDefault()}
  readOnly={isPrimaryAutoCalculated}
  className={`${inputClass} h-[44px] ${
    isPrimaryAutoCalculated
      ? "bg-gray-100 cursor-not-allowed"
      : ""
  }`}
/>
            </div>

            <div className="flex flex-col gap-0.5">
              <label className={labelClass}>Receipt Date *</label>

              <input
                type="date"
                name="receiptDate"
                value={form.receiptDate}
                onChange={handleChange}
                className={`${inputClass} h-[36px] ${
                  errors.receiptDate ? 'border-red-500' : ''
                }`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className={labelClass}>Payment Method *</label>

            <Dropdown
              value={form.paymentMethod}
              onChange={value =>
                setForm({
                  ...form,
                  paymentMethod: value,
                })
              }
              placeholder="Select payment method"
              options={paymentMethods}
              error={errors.paymentMethod}
            />
          </div>

          
          {totalAmount > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
             <h3 className="text-indigo-900 font-semibold text-sm mb-2">
  Receipt Summary
</h3>
<div className="flex justify-between">
 <span className="font-medium text-indigo-900 text-xs">
    • {form.primaryCategory} (Primary)
  </span>

  <span className="font-semibold text-indigo-900">
    ₹{primaryAmount.toFixed(2)}
  </span>
</div>

              {additionalCategories.map(category => (
                <div key={category} className="flex justify-between">
                  <span className="text-purple-400">{category}:</span>

                  <span className="text-purple-600">
                    ₹{parseFloat(additionalAmounts[category] || 0).toFixed(2)}
                  </span>
                </div>
              ))}
          
              <div className="flex justify-between border-t border-purple-200 pt-1 mt-1 font-bold">
               <span className="text-indigo-700">
  Total Receipt Amount:
</span>

                <span className="text-indigo-700">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <label className={labelClass}>Description</label>

            <textarea
              rows={2}
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Additional notes..."
              className={`${inputClass} resize-none py-1.5`}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100">
       <button
  type="button"
  onClick={handleAddReceipt}


            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl py-2 transition"
          >
            Add Receipt
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
