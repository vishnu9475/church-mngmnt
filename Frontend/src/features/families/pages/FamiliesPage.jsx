import React from "react";
import { useLocation } from "react-router-dom";

// binoj
import Sidemenu from "../../../components/common/Sidemenu";

// aswanth
import View_familycard from "../components/FamilyDetailsCard";

// abhijith
import ViewFamilyMembersCard from "../components/ViewFamilyMembersCard";
import FamilyPendingDues from "../components/FamilyPendingDues";

// alka
import FamilyPaymentTracker from "../components/FamilyPaymentTracker";
import MonthlyCollectionDuesDetails from "../components/MonthlyCollectionDuesDetails";

function FamiliesPage() {
  // family_id passed via router state from Ledger_format_table's "View
  // Details" button; falls back to family_id 1 (see View_familycard).
  const location = useLocation();
  const familyId = location.state?.family?.id;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidemenu />

      {/* Main Content */}

  <main className="flex-1 pt-16 lg:pt-6 p-4 md:p-6 lg:ml-60">
    <div className="w-full space-y-6">
      <View_familycard />
      <ViewFamilyMembersCard familyId={familyId} />
      <MonthlyCollectionDuesDetails familyId={familyId} />
      <FamilyPendingDues familyId={familyId} />
      <FamilyPaymentTracker familyId={familyId} />
    </div>
  </main>

    </div>
  );
}

export default FamiliesPage;
