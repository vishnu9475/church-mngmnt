import { useState } from "react";
import UnpaidDuesList from "../components/UnpaidDuesList";
import FamilyDuesStatus from "../components/FamilyDuesStatus";
import IndividualPaymentDues from "../components/IndividualPaymentDues";
import Sidemenu from "../../../components/common/Sidemenu";

function UnpaidDuesPage() {
  const [showPaymentModal, setShowPaymentModal] =
    useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [, setRefreshVersion] = useState(0);

  return (
<div className="min-h-screen bg-[#f4f5f7] lg:flex">
        {/* DASHBOARD SPACE */}
        <Sidemenu />
      

      {/* MAIN */}
<div className="flex-1 min-w-0 lg:ml-64 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden overflow-y-auto">
            <div className="mx-auto w-full max-w-[1220px]">
          <UnpaidDuesList />

          <FamilyDuesStatus
            openPaymentModal={(family) => {
              setSelectedFamily(family);
              setShowPaymentModal(true);
            }}
          />

          {showPaymentModal && selectedFamily && (
            <IndividualPaymentDues
              familyId={selectedFamily.familyId}
              familyName={selectedFamily.familyName}
              monthlyDue={selectedFamily.monthlyDue}
              monthlyPaid={selectedFamily.monthlyPaid}
              closeModal={() => { setShowPaymentModal(false); setSelectedFamily(null); }}
              onPaid={() => setRefreshVersion((version) => version + 1)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default UnpaidDuesPage;
