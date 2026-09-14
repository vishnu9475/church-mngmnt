import Sidemenu from "../../../components/common/Sidemenu";
import BulkDueManagement from "../components/BulkDueManagement";

function BulkDues() {
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <Sidemenu />

      <main className="lg:ml-64 p-4 lg:p-10">
        <BulkDueManagement />
      </main>
    </div>
  );
}

export default BulkDues;