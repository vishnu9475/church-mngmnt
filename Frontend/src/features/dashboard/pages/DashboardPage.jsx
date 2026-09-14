import FinancialYearBanner from '../components/FinancialYearBanner'
import Sidemenu from '../../../components/common/Sidemenu'
import TotalDisplayCards from '../components/TotalDisplayCards'
import CurrentBalances from '../components/CurrentBalances'
import RecentBills from '../components/RecentBills'
import RecentCards from '../components/RecentCards'
import { getRecentBills, getRecentReceipts, getDashboardTotals, getCashBankSummary } from '../../../data/dataService'

export default function DashboardPage() {
  // Read during render so navigating back after a save always reflects MySQL data.
  const recentBills = getRecentBills(3)
  const recentReceipts = getRecentReceipts(6)
  const dashboardTotals = getDashboardTotals()
  const cashBankSummary = getCashBankSummary()
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidemenu left untouched, handled externally via layout properties */}
      <Sidemenu />

      {/* Main content wrapper with exact padding matching your sidebar width */}
      <main className="flex-1 lg:pl-58 w-full min-h-screen">
        {/* Full screen layout container supporting fluid 4K scaling up to 2560px max width */}
        <div className="w-full p-4 md:p-6 lg:p-8 space-y-6 mx-auto max-w-[2560px]">
          <FinancialYearBanner />
          <TotalDisplayCards {...dashboardTotals} />
          
          {/* Kept separated and stacked vertically as requested */}
          <CurrentBalances
            openingCash={cashBankSummary.openingCash}
            cashInHand={cashBankSummary.cashInHand}
            openingBank={cashBankSummary.openingBank}
            bankBalance={cashBankSummary.bankBalance}
          />

          <RecentCards
            recentBills={recentBills}
            recentReceipts={recentReceipts}
          />
        </div>
      </main>
    </div>
  )
}
