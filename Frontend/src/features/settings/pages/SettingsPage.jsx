import { useState } from "react";
import FinancialYearSetting from "../components/FinancialYearSetting";
import Icon from "../../../components/ui/Icon";
import ReceiptNumbering from "../components/ReceiptNumbering";
import { ImportantNotes } from "../components/SettingCard";
import Sidemenu from '../../../components/common/Sidemenu';
import VoucherNumbering from "../components/VoucherNumbering";
import { getSettings, initializeData } from "../../../data/dataService";
import { updateSettings } from "../../../services/settingsService";

export default function SettingsPage() {
  // Seeded from the single-row `settings` table via dataService.
  const savedSettings = getSettings();

  const [receiptPrefix, setReceiptPrefix] = useState(savedSettings.receipt_prefix);
  const [nextReceiptNumber, setNextReceiptNumber] = useState(String(savedSettings.next_receipt_number));
  const [voucherPrefix, setVoucherPrefix] = useState(savedSettings.voucher_prefix);
  const [nextVoucherNumber, setNextVoucherNumber] = useState(String(savedSettings.next_voucher_number));
  const [financialYearStart, setFinancialYearStart] = useState(
    savedSettings.financial_year.split("-")[0] + "-01-01"
  );
  const [openingCashBalance, setOpeningCashBalance] = useState(String(savedSettings.opening_cash));
  const [openingBankBalance, setOpeningBankBalance] = useState(String(savedSettings.opening_bank));
  const [saveState, setSaveState] = useState({ loading: false, message: "", error: "" });

  const financialYear = financialYearStart
    ? `${financialYearStart.slice(0, 4)}-${Number(financialYearStart.slice(0, 4)) + 1}`
    : savedSettings.financial_year;

  async function handleSave() {
    if (!savedSettings.setting_id) {
      setSaveState({ loading: false, message: "", error: "No Settings record was returned by the backend." });
      return;
    }
    setSaveState({ loading: true, message: "", error: "" });
    try {
      await updateSettings(savedSettings.setting_id, {
          receipt_prefix: receiptPrefix.trim(),
          next_receipt_number: Number(nextReceiptNumber),
          voucher_prefix: voucherPrefix.trim(),
          next_voucher_number: Number(nextVoucherNumber),
          financial_year: financialYear,
          opening_cash: Number(openingCashBalance || 0),
          opening_bank: Number(openingBankBalance || 0),
      });
      await initializeData();
      setSaveState({ loading: false, message: "Settings saved. New receipts and vouchers will use these next numbers.", error: "" });
    } catch (error) {
      setSaveState({ loading: false, message: "", error: `Could not save settings: ${error.message}` });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <Sidemenu />

      {/* Main content wrapper containing fluid sizing boundaries for 4K layout space */}
      <main className="flex-1 lg:pl-58 w-full min-h-screen flex flex-col justify-between min-w-0">
        
        {/* Main Content Viewport */}
        <div className="w-full p-4 md:p-6 lg:p-8 space-y-6 mx-auto max-w-[2560px]">
          <header className="mb-6">
            {/* Reduced from font-extrabold to font-semibold as requested */}
            <h1 className="text-3xl font-bold text-gray-900 leading-tight sm:text-[26px] 2xl:text-3xl">
              System Settings
            </h1>
            <p className="mt-1 text-sm text-slate-600 2xl:text-base">
              Configure numbering for receipts and vouchers
            </p>
          </header>

          {/* 
            Changed grid back to a standard vertical space stack. 
            All components are fully separate, independent, and uniform across 1024px, 1440px, and 4K viewports.
          */}
          <div className="space-y-6 2xl:space-y-8">
            <ReceiptNumbering
              receiptPrefix={receiptPrefix}
              setReceiptPrefix={setReceiptPrefix}
              nextReceiptNumber={nextReceiptNumber}
              setNextReceiptNumber={setNextReceiptNumber}
            />

            <VoucherNumbering
              voucherPrefix={voucherPrefix}
              setVoucherPrefix={setVoucherPrefix}
              nextVoucherNumber={nextVoucherNumber}
              setNextVoucherNumber={setNextVoucherNumber}
            />

            <FinancialYearSetting
              financialYearStart={financialYearStart}
              setFinancialYearStart={setFinancialYearStart}
              openingCashBalance={openingCashBalance}
              setOpeningCashBalance={setOpeningCashBalance}
              openingBankBalance={openingBankBalance}
              setOpeningBankBalance={setOpeningBankBalance}
            />

            <ImportantNotes />
          </div>
        </div>

        {/* Sticky footer tracking the 4K viewport max-width scale bounds */}
        <div className="sticky bottom-0 mt-8 border-t border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8 2xl:px-12 z-10 w-full">
          <div className="mx-auto flex w-full max-w-[2560px] justify-end">
            {(saveState.message || saveState.error) && (
              <p className={`mr-4 self-center text-sm ${saveState.error ? "text-red-600" : "text-emerald-700"}`} role="status">
                {saveState.error || saveState.message}
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState.loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              <Icon
                size={16}
                d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8 M7 3v5h8"
              />
              {saveState.loading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
