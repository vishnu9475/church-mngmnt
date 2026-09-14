import UnpaidDuesStatus from "./UnpaidDuesStatus";
import { getFamilyDuesStatus } from "../../../data/dataService";

const currency = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function UnpaidDuesList() {
  // Computed live from families + dues + due_payments + receipts via dataService.
  const familyDuesRows = getFamilyDuesStatus();
  const familiesWithUnpaid = familyDuesRows.filter((r) => r.totalDue > 0);
  const totalUnpaidAmount = familiesWithUnpaid.reduce((sum, r) => sum + r.totalDue, 0);

  return (
    <div className="mx-auto w-full max-w-[1180px]">

      {/* TITLE */}

      <h1 className="text-[32px] font-bold leading-none text-gray-900">
        Unpaid Dues List
      </h1>

      {/* SUBTITLE */}

      <p className="mt-3 text-sm text-gray-500">
        Track monthly collections and pending dues
        for all families
      </p>

      {/* STATUS CARDS */}

      <div className="mt-7 flex flex-col gap-4 xl:flex-row">

        <UnpaidDuesStatus
          title="Total Families"
          value={String(familyDuesRows.length)}
          cardStyle="bg-white border-gray-200"
          textStyle="text-gray-900"
        />

        <UnpaidDuesStatus
          title="Families with Unpaid Dues"
          value={String(familiesWithUnpaid.length)}
          cardStyle="bg-red-50 border-red-200"
          textStyle="text-red-600"
        />

        <UnpaidDuesStatus
          title="Total Unpaid Amount"
          value={currency(totalUnpaidAmount)}
          cardStyle="bg-orange-50 border-orange-200"
          textStyle="text-orange-600"
        />

      </div>

    </div>
  );
}

export default UnpaidDuesList;