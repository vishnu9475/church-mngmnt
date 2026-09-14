import { useState } from "react";
import { initializeData } from "../../../data/dataService";
import { createBankTransaction } from "../../../services/cashBankService";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WithdrawCash({ availableBalance = 0, onWithdraw, onCancel }) {
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleWithdraw = async () => {
    const withdrawalAmount = Number(amount);
    if (!Number.isFinite(withdrawalAmount) || withdrawalAmount <= 0) return setError("Enter an amount greater than ₹0.");
    if (withdrawalAmount > availableBalance) return setError(`Withdrawal cannot exceed available bank balance of ${money(availableBalance)}.`);
    if (!purpose.trim()) return setError("Purpose/Description is required.");

    setIsSaving(true);
    setError("");
    try {
      await createBankTransaction({ transaction_type: "Withdrawal", amount: withdrawalAmount, transaction_date: new Date().toISOString().slice(0, 10), deposited_by: "Cash withdrawal", description: purpose.trim() });
      await initializeData();
      onWithdraw?.();
      onCancel?.();
    } catch (requestError) {
      setError(`Could not record withdrawal: ${requestError.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="relative w-full max-w-[520px] rounded-[14px] bg-white p-6 shadow-xl">
        <button onClick={onCancel} className="absolute right-4 top-3 text-2xl text-gray-500 hover:text-black" aria-label="Close withdrawal form">×</button>
        <h2 className="mb-5 text-xl font-bold text-gray-900">Withdraw Cash from Bank</h2>
        <div className="mb-5 rounded-lg bg-gray-100 p-3"><p className="text-xs text-gray-500">Available Bank Balance</p><p className="mt-1 text-lg font-bold text-gray-900">{money(availableBalance)}</p></div>
        <div className="mb-4"><label className="mb-2 block text-sm font-semibold">Amount to Withdraw <span className="text-red-500">*</span></label><input type="number" min="0.01" max={availableBalance} step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} placeholder="0.00" className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 outline-none" /></div>
        <div className="mb-5"><label className="mb-2 block text-sm font-semibold">Purpose/Description <span className="text-red-500">*</span></label><textarea value={purpose} onChange={(event) => { setPurpose(event.target.value); setError(""); }} placeholder="Reason for withdrawal..." rows="3" className="w-full resize-none rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 outline-none" /></div>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600" role="alert">{error}</p>}
        <div className="flex gap-3"><button onClick={handleWithdraw} disabled={isSaving || availableBalance <= 0} className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300">{isSaving ? "Recording..." : "Withdraw Cash"}</button><button onClick={onCancel} disabled={isSaving} className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-50">Cancel</button></div>
      </div>
    </div>
  );
}
