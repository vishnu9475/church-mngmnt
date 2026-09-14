import { useState } from "react"
import { Users } from "lucide-react"
import { apiRequest, getFamilies, getCategories, initializeData } from "../../../data/dataService";

const REQUIRED_DUE_CATEGORIES = [
  {
    category_name: "Special Church Events",
    description: "Per-family collection for a special church event",
  },
  {
    category_name: "Mission Sunday Fund",
    description: "Per-family Mission Sunday contribution",
  },
];

function CreateBulkDue({ onCreated, onCancel }) {

  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [year, setYear] = useState("2026")
  const [category, setCategory] = useState("")
  const [eventName, setEventName] = useState("")
  const [description, setDescription] = useState("")
  const [searchFamily, setSearchFamily] = useState("")

  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Pulled live from the families table via dataService.
  const familyList = getFamilies().map((f) => ({
    id: f.family_id,
    family: f.family_name,
    name: f.head_of_family,
  }))

  // Read all live Due categories. Use the database ID as the option value so
  // categories with similar names are always saved against the correct record.
  const storedDueCategories = getCategories("Due")
    .filter((item) => item.category_name)
    .sort((first, second) => String(first.category_name).localeCompare(String(second.category_name)))

  // Keep these standard categories available even for an older database that
  // has not yet stored them. They are created in MySQL on first use below.
  const dueCategories = [
    ...storedDueCategories,
    ...REQUIRED_DUE_CATEGORIES
      .filter((required) => !storedDueCategories.some(
        (item) => item.category_name === required.category_name
      ))
      .map((required) => ({
        ...required,
        category_id: `new:${required.category_name}`,
      })),
  ].sort((first, second) => String(first.category_name).localeCompare(String(second.category_name)))

  const selectedCategory = dueCategories.find((item) => String(item.category_id) === String(category))
  const isSpecialChurchEvent = selectedCategory?.category_name === "Special Church Events"

  const filteredFamilies = familyList.filter((item) =>
    item.family.toLowerCase().includes(searchFamily.toLowerCase()) ||
    item.name.toLowerCase().includes(searchFamily.toLowerCase())
  )

  const [selectedFamilies, setSelectedFamilies] = useState([])

  const handleFamilySelect = (id) => {
    if (selectedFamilies.includes(id)) {
      setSelectedFamilies(
        selectedFamilies.filter((item) => item !== id)
      )
    } else {
      setSelectedFamilies([
        ...selectedFamilies,
        id
      ])
    }
  }

  const handleSelectAll = () => {
    if (selectedFamilies.length === familyList.length) {
      setSelectedFamilies([])
    } else {
      setSelectedFamilies(
        familyList.map((family) => family.id)
      )
    }
  }

  const handleCreate = async () => {
    setSubmitted(true)
    setSubmitError("")
    const amountPerFamily = Number(amount)
    if (!Number.isFinite(amountPerFamily) || amountPerFamily <= 0) {
      setSubmitError("Amount per family must be greater than ₹0.00.")
      return
    }
    if (
      !title ||
      !amount ||
      !dueDate ||
      !year ||
      !category ||
      !description ||
      (isSpecialChurchEvent && !eventName.trim()) ||
      selectedFamilies.length === 0
    ) {
      return
    }
    if (!selectedCategory) {
      setSubmitError("Please select a valid due category.")
      return
    }

    setIsSaving(true)
    try {
      let categoryId = selectedCategory.category_id
      if (String(categoryId).startsWith("new:")) {
        const createdCategory = await apiRequest("categories/", {
          method: "POST",
          body: JSON.stringify({
            category_name: selectedCategory.category_name,
            category_type: "Due",
            description: selectedCategory.description,
          }),
        })
        categoryId = createdCategory.category_id
      }

      await apiRequest("bulk-due-collections/", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          amount_per_family: amountPerFamily,
          due_date: dueDate,
          year: Number(year),
          category: categoryId,
          description: [
            isSpecialChurchEvent ? `Event Name: ${eventName.trim()}` : "",
            description.trim(),
          ].filter(Boolean).join("\n"),
          selected_family_ids: selectedFamilies,
        }),
      })
      await initializeData()
      onCreated?.()
    } catch (error) {
      setSubmitError(`Could not create bulk dues: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
     onCancel?.()
  }

  return (

    <div >

      {/* Modal */}
      <div
        className="
          bg-white
          w-full
          max-w-[550px]
          rounded-2xl
          p-5
          relative
        "
      >

        {/* Heading */}
        <h1 className="text-[16px] font-bold mb-5">
          Create Bulk Due Collection
        </h1>

        {submitError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {submitError}
          </p>
        )}

        {/* Collection Details */}
        <div className="border border-gray-200 rounded-2xl p-4 mb-4">

          <h2 className="text-[15px] font-bold mb-4">
            Collection Details
          </h2>

          {/* Title */}
          <div className="mb-4">

            <label className="block text-sm font-semibold mb-2">
              Collection Title *
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mission Sunday, Building Fund"
              className={`
                w-full
                bg-gray-100
                border
                rounded-lg
                px-4
                py-2
                text-sm
                outline-none
                focus:ring-2
                focus:ring-gray-300 focus:border-gray-300

                ${
                  submitted && !title
                    ? "border-red-500"
                    : "border-gray-100"
                }
              `}
            />

          </div>

          {/* Amount + Due Date */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">

            <div>

              <label className="block text-sm font-semibold mb-2">
                Amount Per Family *
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`
                  w-full
                  bg-gray-100
                  border
                  rounded-lg
                  px-4
                  py-2
                  text-sm
                  outline-none
                  focus:ring-2
                focus:ring-gray-300 focus:border-gray-300

                  ${
                    submitted && !amount
                      ? "border-red-500"
                      : "border-gray-100"
                  }
                `}
              />

            </div>

            <div>

              <label className="block text-sm font-semibold mb-2">
                Due Date *
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`
                  w-full
                  bg-gray-100
                  border
                  rounded-lg
                  px-4
                  py-2
                  text-sm
                  outline-none
                  focus:ring-2
                focus:ring-gray-300 focus:border-gray-300
                  ${
                    submitted && !dueDate
                      ? "border-red-500"
                      : "border-gray-100"
                  }
                `}
              />

            </div>

          </div>

          {/* Year + Category */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">

            <div>

              <label className="block text-sm font-semibold mb-2">
                Year *
              </label>

              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={`
                  w-full
                  bg-gray-100
                  border
                  rounded-lg
                  px-4
                  py-2
                  text-sm
                  outline-none
                  focus:ring-2
                focus:ring-gray-300 focus:border-gray-300

                  ${
                    submitted && !year
                      ? "border-red-500"
                      : "border-gray-100"
                  }
                `}
              />

            </div>

            <div>

              <label className="block text-sm font-semibold mb-2">
                Category *
              </label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`
                  w-full
                  bg-gray-100
                  border
                  rounded-lg
                  px-4
                  py-2
                  text-sm
                  outline-none
                  focus:ring-2
                focus:ring-gray-300 focus:border-gray-300

                  ${
                    submitted && !category
                      ? "border-red-500"
                      : "border-gray-100"
                  }
                `}
              >
                <option value="">{dueCategories.length ? "Select Due category" : "No Due categories available"}</option>
                {dueCategories.map((item) => (
                  <option key={item.category_id} value={item.category_id}>{item.category_name}</option>
                ))}
              </select>

            </div>

          </div>

          {isSpecialChurchEvent && (
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">
                Event Name *
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Parish Feast, Harvest Festival"
                className={`
                  w-full bg-gray-100 border rounded-lg px-4 py-2 text-sm outline-none
                  focus:ring-2 focus:ring-gray-300 focus:border-gray-300
                  ${submitted && !eventName.trim() ? "border-red-500" : "border-gray-100"}
                `}
              />
              <p className="mt-1 text-xs text-gray-500">
                This event name is saved with the collection and every family due.
              </p>
            </div>
          )}

          {/* Description */}
          <div>

            <label className="block text-sm font-semibold mb-2">
              Description
            </label>

            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes about this collection..."
              className={`
                w-full
                bg-gray-100
                border
                rounded-lg
                px-4
                py-2
                text-sm
                resize-none
                outline-none
                focus:ring-2
                focus:ring-gray-300 focus:border-gray-300

                ${
                  submitted && !description
                    ? "border-red-500"
                    : "border-gray-100"
                }
              `} />

          </div>
        </div>

        {/* Select Families */}
        <div className="border border-gray-200 rounded-2xl p-4 mb-5">

          <h2 className="text-[15px] font-bold mb-4">
            Select Families
          </h2>

          {/* Search */}
          <div className="mb-4">

            <input
              type="text"
              value={searchFamily}
              onChange={(e) => setSearchFamily(e.target.value)}
              placeholder="Search families..."
              className={` w-full bg-gray-100 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300
                ${
                  submitted && selectedFamilies.length === 0
                    ? "border-red-500"
                    : "border-gray-200"
                } `} />

          </div>

          {/* Select All */}
          <div className="flex justify-between items-center mb-3">

            <p className="text-sm font-semibold">
              Family List
            </p>

            <label className="flex items-center gap-2 cursor-pointer">

              <input
                type="checkbox"
                checked={
                  selectedFamilies.length === familyList.length
                }
                onChange={handleSelectAll}
                className="  w-4  h-4 accent-gray-500"/>

             <span className="text-sm font-medium">
                 Select All ({familyList.length})
             </span>
            </label>
          </div>

          {/* Family List */}
          <div
            className={` border rounded-xl p-3 space-y-2 max-h-[70px] overflow-y-auto
              ${
                submitted && selectedFamilies.length === 0
                  ? "border-red-500"
                  : "border-gray-200"
              } `} >

            {filteredFamilies.map((item) => (

              <label
                key={item.id}
                className="
                  flex
                  items-center
                  gap-3
                  cursor-pointer  ">

                <input
                  type="checkbox"
                  checked={selectedFamilies.includes(item.id)}
                  onChange={() => handleFamilySelect(item.id)}
                  className="w-4 h-4 accent-gray-500"/>

                <div className="text-sm">
                  <span className="font-bold">
                    {item.family}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {item.name}
                  </span>
                </div>
              </label>
            ))}
          </div>

          {/* Error */}
          {submitted && selectedFamilies.length === 0 && (

            <p className="text-red-500 text-xs mt-2">
              Please select at least one family
            </p>

          )}

          {/* Selected Count */}
          {selectedFamilies.length > 0 && (

            <div
               className=" bg-blue-50 rounded-xl px-2 py-1 flex items-center gap-2 mt-3">

              <Users className="text-blue-600 w-4 h-4" />

              <p className="text-blue-700 text-sm font-medium">
                {selectedFamilies.length === 1
                  ? "1 family selected"
                  : `${selectedFamilies.length} families selected`}
                {" "}•{" "}
                Total: ₹
                {(
                  Number(amount || 0) * selectedFamilies.length
                ).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">

          <button
            onClick={handleCreate}
            disabled={isSaving}
            className="
              flex-1
              bg-black
              text-white
              py-2
              rounded-xl
              text-sm
              font-semibold
              hover:bg-gray-800
            " >
            {isSaving ? "Creating..." : "Create Dues for "}{!isSaving && selectedFamilies.length}{" "}
            {!isSaving && (selectedFamilies.length === 1
              ? "Family"
              : "Families")}
          </button>

          <button
            onClick={handleCancel}
            className="
              px-6
              py-2
              border
              border-gray-300
              rounded-xl
              text-sm
              hover:bg-gray-100
            "
          >
            Cancel
          </button>

        </div>

      </div>

    </div>
  )
}

export default CreateBulkDue
