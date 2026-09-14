import Ledger_format_table from "../components/FamilyTable";
import Families_members from "../components/FamilyMembers";
import Sidemenu from "../../../components/common/Sidemenu";

function Families() {
  return (
    <div className="min-h-screen bg-white">
      <Sidemenu />

      {/* MAIN CONTENT AREA */}
      <main className="flex min-w-0 flex-col gap-6 p-4 sm:p-6 lg:ml-58 lg:p-8">
        {/* Top Segment: Family Members overview */}
        <div className="w-full">
          <Families_members />
        </div>

        {/* Bottom Segment: Responsive Ledger Table */}
        <div className="w-full">
          <Ledger_format_table />
        </div>
      </main>
    </div>
  );
}

export default Families;
