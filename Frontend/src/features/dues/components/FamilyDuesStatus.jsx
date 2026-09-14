import {
  FiSearch,
  FiAlertCircle,
  FiDollarSign,
} from "react-icons/fi";
import { useEffect, useState } from "react";
import { getFamilyDuesStatusPage } from "../../../data/dataService";
import PaginationControls from "../../../components/common/PaginationControls";

const PAGE_SIZE = 25;

const currency = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusBadgeClass = {
  Paid: "bg-green-100 text-green-700",
  Partial: "bg-yellow-100 text-yellow-700",
  Unpaid: "bg-red-100 text-red-600",
};

const rowBgClass = {
  Paid: "bg-white",
  Partial: "bg-[#fffdf6]",
  Unpaid: "bg-[#fff6f6]",
};

function FamilyDuesStatus({
  openPaymentModal,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [families, setFamilies] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError("");
    getFamilyDuesStatusPage({ page, pageSize: PAGE_SIZE, search })
      .then((response) => {
        if (!active) return;
        setFamilies(response.results);
        setTotalCount(response.count);
        setUnpaidTotal(Number(response.meta?.unpaid_total || 0));
      })
      .catch((error) => {
        if (!active) return;
        setFamilies([]);
        setTotalCount(0);
        setUnpaidTotal(0);
        setLoadError(error.message || "Unable to load unpaid dues.");
      })
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [page, search]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="mt-6 w-full">

      <div className="mx-auto w-full max-w-[1180px]">

        {/* SEARCH BAR */}

        <div className="relative mb-6">

          <FiSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={15}
          />

          <input
            type="text"
            placeholder="Search families..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="h-[40px] w-full rounded-2xl border border-gray-200 bg-[#ececec] pl-11 pr-4 text-sm outline-none"
          />

        </div>

        {/* MAIN CARD */}

        <div className="rounded-[24px] border border-gray-200 bg-white p-5">

          <div className="rounded-2xl bg-white">

            {/* TITLE */}

            <div className="border-b border-gray-100 px-5 py-4">

              <h2 className="text-lg font-bold text-gray-800">
                Family Dues Status
              </h2>

            </div>

            {/* TABLE */}

<div className="max-h-[250px] overflow-y-auto overflow-x-auto">

              <table className="min-w-full w-full border-collapse">

<thead className="sticky top-0 z-10 bg-gray-50">
<tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                      SL No
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                      Family Name
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                      Head of Family
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                      Monthly Due
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                      Monthly Status
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                      Other Dues
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                      Total Paid
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                      Total Due
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {isLoading ? (
                    <tr><td colSpan="9" className="px-4 py-10 text-center text-sm text-gray-500">Loading unpaid dues…</td></tr>
                  ) : loadError ? (
                    <tr><td colSpan="9" className="px-4 py-10 text-center text-sm text-red-600">{loadError}</td></tr>
                  ) : families.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-10 text-center text-sm text-gray-500">
                        {search ? "No matching unpaid dues found." : "No unpaid or partially paid dues found."}
                      </td>
                    </tr>
                  ) : families.map((row, index) => (
                    <tr
                      key={row.familyId}
                      className={`border-b border-[#f3dede] ${rowBgClass[row.monthlyStatus]} hover:bg-gray-50 transition-colors duration-200 cursor-pointer`}
                    >
                      <td className="px-4 py-4 text-sm font-medium">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold">
                        {row.familyName}
                      </td>

                      <td className="px-4 py-4 text-sm">
                        {row.headOfFamily}
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <p className="font-semibold">{currency(row.monthlyDue)}</p>
                        <p className="text-sm text-gray-500">Paid: {currency(row.monthlyPaid)}</p>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusBadgeClass[row.monthlyStatus]}`}>
                          {row.monthlyStatus}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                        {row.otherDues}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-green-600">
                        {currency(row.totalPaid)}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-red-600">
                        {currency(row.totalDue)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openPaymentModal({ familyId: row.familyId, familyName: row.familyName, monthlyDue: row.monthlyDue, monthlyPaid: row.monthlyPaid })}
                            disabled={row.otherDues === "None" && row.monthlyDue <= row.monthlyPaid}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            <FiDollarSign size={14} />
                            <span>{row.otherDues === "None" && row.monthlyDue <= row.monthlyPaid ? "No dues" : "Pay"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                </tbody>

              </table>

            </div>

          </div>

          <div className="mt-5">
            <PaginationControls
              page={currentPage}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </div>

          {/* ALERT */}

          {totalCount > 0 && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3">

              <FiAlertCircle
                className="mt-1 text-yellow-700"
                size={18}
              />

              <div>

                <h3 className="text-sm font-semibold text-yellow-700">
                  Attention Required
                </h3>

                <p className="mt-2 text-sm text-yellow-800">
                  {totalCount} {totalCount === 1 ? "family has" : "families have"} unpaid dues totaling {currency(unpaidTotal)}.
                  Please follow up for collections.
                </p>

              </div>

            </div>
          )}

        </div>



      </div>


    </div>
  );
}

export default FamilyDuesStatus;
