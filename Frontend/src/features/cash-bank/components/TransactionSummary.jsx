import { 
  Wallet, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  ArrowDownToLine, 
  ArrowUpFromLine 
} from "lucide-react";
import { getCashBankSummary } from "../../../data/dataService";

const currency = (v) =>
  `${v < 0 ? "-" : "+"}₹${Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plainCurrency = (v) =>
  `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Updated Row component to accept and render an icon dynamically
const Row = ({ label, value, bg, color, icon: Icon }) => {
  return (
    <div
      className="flex justify-between items-center bg-white rounded-2xl border border-gray-200 p-5 mb-3"
      style={{ backgroundColor: bg, color }}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon size={18} />}
        <span>{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
};

const TransactionSummary = () => {
  // Computed live from settings (opening balances) + receipts + bills +
  // bank_transactions via dataService.
  const summary = getCashBankSummary();

  return (
    <div className="bg-white border border-gray-300 rounded-2xl p-8 mt-10">
      <h2 className="text-2xl font-bold mb-8 text-[#0f172a]">
        Transaction Summary
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Cash Transactions Section */}
        <div>
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Wallet size={22} color="#16a34a" />
            Cash Transactions
          </h3>

          <Row 
            label="Opening Balance" 
            value={summary.openingCash} 
            bg="#f8fafc" 
            color="#64748b"
            icon={TrendingUp} 
          />
          <Row
            label="Total Cash Receipts"
            value={currency(summary.cashReceipts)}
            bg="#ecfdf5"
            color="#16a34a"
            icon={TrendingUp}
          />
          <Row
            label="Total Cash Bills"
            value={currency(-summary.cashBills)}
            bg="#fef2f2"
            color="#dc2626"
            icon={TrendingDown}
          />
          <Row
            label="Deposited to Bank"
            value={currency(-summary.totalDeposits)}
            bg="#eff6ff"
            color="#2563eb"
            icon={ArrowDownToLine}
          />
          <Row
            label="Withdrawn from Bank"
            value={currency(summary.totalWithdrawals)}
            bg="#ecfdf5"
            color="#16a34a"
            icon={ArrowUpFromLine}
          />
          <div className="border-t border-gray-300 my-5"></div>
          <Row
            label="Current Cash Balance"
            value={plainCurrency(summary.cashInHandRaw)}
            bg="#dcfce7"
            color="#166534"
          />
        </div>

        {/* Bank Transactions Section */}
        <div>
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Building2 size={22} color="#2563eb" />
            Bank Transactions
          </h3>

          <Row 
            label="Opening Balance" 
            value={summary.openingBank} 
            bg="#f8fafc" 
            color="#64748b"
            icon={TrendingUp} 
          />
          <Row
            label="Total Bank Receipts"
            value={currency(summary.bankReceipts)}
            bg="#ecfdf5"
            color="#16a34a"
            icon={TrendingUp}
          />
          <Row
            label="Total Bank Bills"
            value={currency(-summary.bankBills)}
            bg="#fef2f2"
            color="#dc2626"
            icon={TrendingDown}
          />
          <Row
            label="Received from Cash"
            value={currency(summary.totalDeposits)}
            bg="#eff6ff"
            color="#2563eb"
            icon={ArrowUpFromLine}
          />
          <Row
            label="Withdrawn to Cash"
            value={currency(-summary.totalWithdrawals)}
            bg="#fef2f2"
            color="#dc2626"
            icon={ArrowDownToLine}
          />
          <div className="border-t border-gray-300 my-5"></div>
          <Row
            label="Current Bank Balance"
            value={plainCurrency(summary.bankBalanceRaw)}
            bg="#dbeafe"
            color="#1d4ed8"
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionSummary;
