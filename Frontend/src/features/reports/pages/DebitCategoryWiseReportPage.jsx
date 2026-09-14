import { Link } from "react-router-dom";
import Sidemenu from "../../../components/common/Sidemenu";
import ExpensesByCategory from "../components/ExpensesByCategory";

export default function DebitWiseReportPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      
      <Sidemenu/>
    
      <main className="lg:ml-[232px] min-h-screen p-4 md:p-6">
       <Link
         to="/reports"
         className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
       >
         ← Back to Financial Reports
       </Link>
       <ExpensesByCategory />
      </main>
    </div>
  );
}
