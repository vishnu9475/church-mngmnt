import { useState } from "react";
import { initializeData } from "../../../data/dataService";
import { createBankTransaction } from "../../../services/cashBankService";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function DepositCash({ availableCash = 0, onCancel, onDeposited }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [depositedBy, setDepositedBy] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleDeposit = async () => {
    const depositAmount = Number(amount);
    if (!Number.isFinite(depositAmount) || depositAmount <= 0) return setError("Enter a deposit amount greater than ₹0.");
    if (depositAmount > availableCash) return setError(`Deposit cannot exceed available cash of ${money(availableCash)}.`);
    if (!date) return setError("Select a deposit date.");
    if (!depositedBy.trim()) return setError("Enter the depositor name.");

    setIsSaving(true);
    setError("");
    try {
      await createBankTransaction({ transaction_type: "Deposit", amount: depositAmount, transaction_date: date, deposited_by: depositedBy.trim(), description: description.trim() || "Cash deposited to bank" });
      await initializeData();
      onDeposited?.();
      onCancel?.();
    } catch (requestError) {
      setError(`Could not deposit cash: ${requestError.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-[620px] rounded-sm border border-gray-100 bg-[#f7f7f7] p-6 shadow-md">
        <button className="absolute right-4 top-3 text-[22px] font-light text-gray-600" onClick={onCancel} aria-label="Close deposit form">×</button>
        <h2 className="mb-6 text-[22px] font-semibold text-black">Deposit Cash to Bank</h2>
        <div className="mb-5 rounded-[10px] bg-[#ebebeb] p-4"><p className="mb-1 text-[16px] font-medium text-gray-600">Available Cash in Hand</p><h1 className="text-[24px] font-bold text-black">{money(availableCash)}</h1></div>
        <div className="mb-4"><label className="mb-1 block text-[16px] font-semibold text-black">Amount to Deposit <span className="text-red-500">*</span></label><input type="number" min="0.01" max={availableCash} step="0.01" placeholder="0.00" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} className="h-[48px] w-full rounded-[12px] border-2 border-transparent bg-gray-200 px-4 text-[16px] text-gray-700 outline-none shadow-inner focus:border-gray-400" /></div>
        <div className="mb-4"><label className="mb-1 block text-[16px] font-semibold text-black">Date <span className="text-red-500">*</span></label><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setError(""); }} className="h-[42px] w-full rounded-[10px] border-2 border-transparent bg-gray-200 px-4 text-[16px] text-black outline-none focus:border-gray-400" /></div>
        <div className="mb-4"><label className="mb-1 block text-[16px] font-semibold text-black">Deposited By <span className="text-red-500">*</span></label><input type="text" placeholder="Name of person depositing" value={depositedBy} onChange={(event) => { setDepositedBy(event.target.value); setError(""); }} className="h-[42px] w-full rounded-[10px] border-2 border-transparent bg-gray-200 px-4 text-[16px] text-black outline-none focus:border-gray-400" /></div>
        <div className="mb-5"><label className="mb-1 block text-[16px] font-semibold text-black">Description</label><textarea rows="3" placeholder="Additional notes..." value={description} onChange={(event) => setDescription(event.target.value)} className="w-full resize-none rounded-[10px] bg-gray-200 px-4 py-3 text-[16px] text-black outline-none" /></div>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600" role="alert">{error}</p>}
        <div className="flex items-center gap-3"><button onClick={handleDeposit} disabled={isSaving || availableCash <= 0} className="flex-1 rounded-[10px] bg-[#00001a] text-white h-[44px] text-[16px] font-semibold hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400">{isSaving ? "Depositing..." : "Deposit to Bank"}</button><button onClick={onCancel} disabled={isSaving} className="h-[44px] rounded-[10px] border border-gray-300 bg-[#f7f7f7] px-7 text-[16px] font-medium hover:bg-gray-100">Cancel</button></div>
      </div>
    </div>
  );
}

export default DepositCash;
