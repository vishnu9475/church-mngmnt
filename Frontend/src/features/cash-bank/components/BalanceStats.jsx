import { Wallet, Building2, DollarSign } from "lucide-react";
import { getCashBankSummary } from "../../../data/dataService";
const Card = ({
  icon,
  title,
  amount,
  subtitle,
  bg,
  amountColor,
  titleColor,
}) => {
  return (
    <div
      className="rounded-xl border border-gray-300 p-5 min-h-[120px]"
      style={{ backgroundColor: bg }}
    >
   <div
  className="flex items-center justify-between text-xs font-semibold"
  style={{ color: titleColor }}
>
  <span>{title}</span>
  {icon}
</div>

      <h2
        className="text-2xl font-bold mt-4"
        style={{ color: amountColor }}
      >
        ₹{amount}
      </h2>

      <p
        className="text-[11px] mt-2"
        style={{ color: titleColor }}
      >
        {subtitle}
      </p>
    </div>
  );
};

const BalanceStats = () => {
  const { cashInHandRaw, bankBalanceRaw } = getCashBankSummary();
  const totalBalance = cashInHandRaw + bankBalanceRaw;

  return (
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card
        icon={<Wallet size={20} />}
        title="Cash in Hand"
        amount={cashInHandRaw.toFixed(2)}
        subtitle="Available cash"
        bg="#ECFDF5"
        amountColor="#166534"
        titleColor="#15803D"
      />

      <Card
       icon={<Building2 size={20} />}
        title="Bank Balance"
        amount={bankBalanceRaw.toFixed(2)}
        subtitle="In bank account"
        bg="#EFF6FF"
        amountColor="#1D4ED8"
        titleColor="#2563EB"
      />

      <Card
       icon={<DollarSign size={20} />}
        title="Total Balance"
        amount={totalBalance.toFixed(2)}
        subtitle="Cash + Bank"
        bg="#FAF5FF"
        amountColor="#9333EA"
        titleColor="#A855F7"
      />
    </div>
  );
};

export default BalanceStats;
