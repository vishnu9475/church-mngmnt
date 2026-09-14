import TotalDeposits from "./TotalDeposits";
import { getDepositStatistics } from "../../../data/dataService";

function DepositStatistics() {
  // Computed live from the bank_transactions table via dataService.
  const stats = getDepositStatistics();

  return (
    <div className="bg-white rounded-2xl  p-5">

      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Deposit Statistics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <TotalDeposits
          title="Total Deposits"
          value={String(stats.count)}
        />

        <TotalDeposits
          title="Total Amount Deposited"
          value={stats.total}

        />

        <TotalDeposits
          title="Average Deposit"
          value={stats.average}
        />

      </div>

    </div>
  );
}

export default DepositStatistics;