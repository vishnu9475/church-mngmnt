const PaidDueStats = ({ payments = [], year, summary }) => {
  const totalAmount = summary ? Number(summary.total_paid || 0) : payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const paymentCount = summary ? Number(summary.payment_count || 0) : payments.length;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-[#EEF4FF] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[34px] font-semibold leading-none text-[#2563EB]">₹</div>
        <div className="min-w-0"><p className="text-sm text-gray-500">Total Paid in {year}</p><h1 className="break-all text-2xl font-bold text-gray-800 md:text-3xl">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1></div>
      </div>
      <div className="border-t pt-3 md:border-0 md:pt-0 md:text-right"><p className="text-sm text-gray-500">Total Payments</p><h1 className="text-2xl font-bold text-gray-800 md:text-3xl">{paymentCount}</h1></div>
    </div>
  );
};

export default PaidDueStats;
