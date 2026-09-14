import { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import { FaChevronDown } from "react-icons/fa";

const AddEditNewDue = ({
  isOpen,
  setIsOpen,
  addDue,
  editDue,
  dueCategories = [],
}) => {

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [year, setYear] = useState("2026");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const isPreviousMonthlyDue = Boolean(editDue) && (
    String(editDue?.description || "").includes("[monthly-tracker-due]")
    || String(editDue?.description || "").includes("[monthly-opening-due]")
    || ["Previous Monthly Dues Pending", "Previous Monthly Payment Dues"].includes(String(editDue?.title || ""))
  );
  const availableDueCategories = dueCategories
    .filter((item) => !item.category_type || item.category_type === "Due")
    .sort((first, second) => String(first.category_name).localeCompare(String(second.category_name)));

  // Edit Data Fill
  useEffect(() => {

    if (editDue) {

      setTitle(editDue.title || "");
      setAmount(editDue.totalAmount || editDue.amount || "");
      const [day, month, dateYear] = String(editDue.dueDate || "").split("/");
      setDueDate(dateYear ? `${dateYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : editDue.dueDate || "");
      setCategory(editDue.category || "");
      setDescription(editDue.description || "");

      setYear(dateYear || new Date(editDue.dueDate).getFullYear().toString());
    } else if (isOpen) {
      // Opening a fresh Add Due form must never retain a prior edited due.
      setTitle("");
      setAmount("");
      setDueDate("");
      setYear(String(new Date().getFullYear()));
      setCategory("");
      setDescription("");
    }

  }, [editDue, isOpen]);

  // Close Modal
  const closeModal = () => {
    
    const confirmCancel = window.confirm(
      "Do you want to cancel?"
    );
    if (!confirmCancel) return;
    setIsOpen(false);
  };

  // Submit
  const handleAddDue = async (e) => {

    e.preventDefault();

    if (!title || !amount || !dueDate || !category) {

      alert("Please fill mandatory fields");

      return;

    }

    const newDue = {
      title,
      amount,
      dueDate,
      year,
      category,
      description,
    };

      // Show confirmation only while editing
      if (editDue) {
        const confirmUpdate = window.confirm(
          "Are you sure you want to update this due?"
        );
        if (!confirmUpdate) return;
      }


    try {
      await addDue(newDue);
    } catch (error) {
      alert(`Could not save due: ${error.message}`);
      return;
    }

    // Reset Fields
    setTitle("");
    setAmount("");
    setDueDate("");
    setCategory("");
    setDescription("");

    setIsOpen(false);

  };

  

  // Hide Modal
  if (!isOpen) return null;

  return (

    <div
      className="
        fixed
        inset-0
        bg-black/40
        flex
        items-center
        justify-center
        z-50
      "
    >

      {/* Modal */}
      <div
        className="
          bg-white
          rounded-2xl
          shadow-xl
          w-full
          max-w-135
          p-6
          max-h-screen
        "
      >

        {/* Header */}
        <div className="flex items-center justify-between mb-5">

          <h1 className="text-[20px] font-semibold text-black">

            {editDue ? "Edit Due" : "Add New Due"}

          </h1>

          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-black"
          >
            <IoClose size={24} />
          </button>

        </div>

        {/* Form */}
        <form
          onSubmit={handleAddDue}
          className="space-y"
        >

          {/* Title */}
          <div>

            <label className="text-sm font-medium text-black">

              Title <span className="text-red-500">*</span>

            </label>

            <input
              type="text"
              placeholder="e.g., Annual Church Fund"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`
                w-full
                mt-2
                bg-gray-100
                border
                border-gray-200
                rounded-xl
                px-4
                py-2.5
                text-base
                outline-none
                focus:border-black
              "
            />

          </div>

          {/* Amount */}
          <div>

            <label className="text-sm font-medium text-black">

              Amount <span className="text-red-500">*</span>

            </label>

            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              readOnly={isPreviousMonthlyDue}
              className="
                w-full
                mt-2
                bg-gray-100
                border
                border-gray-200
                rounded-xl
                px-4
                py-2.5
                text-base
                outline-none
                ${isPreviousMonthlyDue ? "cursor-not-allowed opacity-70" : ""}
              `}
            />
            {isPreviousMonthlyDue && <p className="mt-1 text-xs text-blue-700">Locked: this amount is calculated from Monthly Payment Dues Details.</p>}

          </div>

          {/* Due Date */}
          <div>

            <label className="text-sm font-medium text-black">

              Due Date <span className="text-red-500">*</span>

            </label>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="
                w-full
                mt-2
                bg-gray-100
                border
                border-gray-200
                rounded-xl
                px-4
                py-2.5
                text-base
                outline-none
              "
            />

          </div>

          {/* Year */}
          <div>

            <label className="text-sm font-medium text-black">

              Year <span className="text-red-500">*</span>

            </label>

            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="
                w-full
                mt-2
                bg-gray-100
                border
                border-gray-200
                rounded-xl
                px-4
                py-2.5
                text-base
                outline-none
              "
            />

          </div>

          {/* Category */}
          <div>

            <label className="text-sm font-medium text-black">

              Category <span className="text-red-500">*</span>

            </label>

            <div className="relative">

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isPreviousMonthlyDue}
                className="
                  w-full
                  mt-2
                  bg-gray-100
                  border
                  border-gray-200
                  rounded-xl
                  px-4
                  py-2.5
                  text-base
                  appearance-none
                  outline-none
                "
              >

                <option value="">{availableDueCategories.length ? "Select Due category" : "No Due categories available"}</option>
                {availableDueCategories.map((item) => <option key={item.category_id} value={item.category_name}>{item.category_name}</option>)}

              </select>

              {isPreviousMonthlyDue && <p className="mt-1 text-xs text-blue-700">Locked: Previous Monthly Dues Pending always uses Monthly Collection.</p>}

              <FaChevronDown
                className="
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

            </div>

          </div>

          {/* Description */}
          <div>

            <label className="text-sm font-medium text-black">

              Description

            </label>

            <textarea
              placeholder="Additional notes..."
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows={2}
              className="
                w-full
                mt-2
                bg-gray-100
                border
                border-gray-200
                rounded-xl
                px-4
                py-3
                text-base
                outline-none
                resize-none
              "
            />

          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-1">

            {/* Submit */}
            <button
              type="submit"
              className="
                flex-1
                bg-black
                text-white
                py-2.5
                rounded-xl
                text-base
                font-medium
                hover:bg-gray-900
              "
            >

              {editDue ? "Update Due" : "Add Due"}

            </button>

            {/* Cancel */}
            <button
              type="button"
              onClick={closeModal}
              className="
                px-6
                py-3
                border
                border-gray-300
                rounded-xl
                text-base
                hover:bg-gray-100
              "
            >
              Cancel
            </button>

          </div>

        </form>

      </div>

    </div>

  );
};

export default AddEditNewDue;
