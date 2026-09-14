import IndividualDeposit from "./IndividualDeposit";
import { getRecentDeposits } from "../../../data/dataService";

function RecentDeposits() {
  // Sourced live from the bank_transactions table via dataService.
  const deposits = getRecentDeposits(5);

  return (
    <div className="bg-white rounded-2xl p-5">

      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Recent Deposits to Bank
      </h2>

      {deposits.map((d, index) => (
        <IndividualDeposit
          key={index}
          personName={d.personName}
          date={d.date}
          depositType={d.depositType}
          amount={d.amount}
        />
      ))}

    </div>
  );
}

export default RecentDeposits;