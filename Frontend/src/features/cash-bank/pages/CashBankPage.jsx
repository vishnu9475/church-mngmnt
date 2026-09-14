import { useState } from "react";

// Local components
import CashBankManagement from "../components/CashBankManagement";
import TransactionSummary from "../components/TransactionSummary";
import DepositButton from "../components/DepositButton";

// Team components
import RecentDeposits from "../components/RecentDeposits";
import DepositStatistics from "../components/DepositStatistics";
import WithdrawCash from "../components/WithdrawCash";
import DepositCash from "../components/DepositCash";
import Sidemenu from "../../../components/common/Sidemenu";
import { getCashBankSummary } from "../../../data/dataService";

const CashBankPage = () => {

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [, setRefreshVersion] = useState(0);
  const cashSummary = getCashBankSummary();

  return (
    <div className="min-h-screen bg-white">
      <Sidemenu />

      {/* Main Content */}
      <main className="min-w-0 px-4 py-6 sm:px-6 md:px-8 lg:ml-58 lg:px-10">

        <DepositButton
          onDepositClick={() => setShowDeposit(true)}
          onWithdrawClick={() => setShowWithdraw(true)}
        />

        <div className="mt-5 space-y-5">
          <CashBankManagement />
          <TransactionSummary />

        <RecentDeposits />

        <DepositStatistics />
 
        </div>

        
        {/* POPUPS */}
        {showWithdraw && (
          <WithdrawCash
            availableBalance={Math.max(0, cashSummary.bankBalanceRaw)}
            onCancel={() => setShowWithdraw(false)}
            onWithdraw={() => setRefreshVersion((version) => version + 1)}
          />
        )}

        {showDeposit && (
          <DepositCash
            availableCash={Math.max(0, cashSummary.cashInHandRaw)}
            onCancel={() => setShowDeposit(false)}
            onDeposited={() => setRefreshVersion((version) => version + 1)}
          />
        )}

      </main>
    </div>
  );
};

export default CashBankPage;
