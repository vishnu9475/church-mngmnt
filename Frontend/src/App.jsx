import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import './App.css'

const JournalPage = lazy(() => import("./features/journal/pages/JournalPage"));
const DashboardPage = lazy(() => import("./features/dashboard/pages/DashboardPage"));
const DuesReportPage = lazy(() => import("./features/reports/pages/DuesReportPage"));
const BillsManagementPage = lazy(() => import("./features/bills/pages/BillsManagementPage"));
const Page5 = lazy(() => import("./features/receipts/pages/ReceiptsPage"));
const CategoryPage = lazy(() => import("./features/categories/pages/CategoriesPage"));
const CategoryReportPage = lazy(() => import("./features/reports/pages/CategoryReportPage"));
const CashBankPage = lazy(() => import("./features/cash-bank/pages/CashBankPage"));
const FinancialReportsPage = lazy(() => import("./features/reports/pages/FinancialReportsPage"));
const FamiliesPage = lazy(() => import("./features/families/pages/FamiliesPage"));
const Families = lazy(() => import("./features/families/pages/FamiliesListPage"));
const SettingsPage = lazy(() => import("./features/settings/pages/SettingsPage"));
const BulkDues = lazy(() => import("./features/dues/pages/BulkDuesPage"));
const UnpaidDuesPage = lazy(() => import("./features/dues/pages/UnpaidDuesPage"));
const DebitCategoryWiseReportPage = lazy(() => import("./features/reports/pages/DebitCategoryWiseReportPage"));

function PageLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-600">
      Loading page…
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />}/>

      <Route path="/" element={<Navigate to="/bills" replace />} />
      <Route path="/bills" element={<BillsManagementPage/>}/>

      <Route path="/" element={<Navigate to="/receipts" replace />} />
      <Route path="/receipts" element={<Page5 />}  />

      <Route path="/" element={<Navigate to="/categories" replace />} /> 
      <Route path="/categories" element={<CategoryPage />} />

      <Route path="/" element={<Navigate to="/families" replace />} />
      <Route path="/families" element={<Families />} />

      <Route path="/" element={<Navigate to="/bulk-dues" replace />} />
      <Route path="/bulk-dues" element={<BulkDues />} />

      <Route path="/" element={<Navigate to="/unpaid-dues" replace />} /> 
      <Route path="/unpaid-dues" element={<UnpaidDuesPage/>} />

      <Route path="/" element={<Navigate to="/cash-bank" replace />} /> 
      <Route path="/cash-bank" element={<CashBankPage />} />

      <Route path="/" element={<Navigate to="/reports" replace />} />
      <Route path="/reports" element={<FinancialReportsPage />} />

      <Route path="/" element={<Navigate to="/ledger" replace />} />
      <Route path="/ledger" element={<JournalPage />} />

      <Route path="/" element={<Navigate to="/settings" replace />} />
      <Route path="/settings" element={<SettingsPage />} />

 
    
      <Route path="/category-wise-report"       element={<CategoryReportPage />} />
      <Route path="/debit-category-wise-report" element={<DebitCategoryWiseReportPage />} />
      <Route path="/dues-report"                element={<DuesReportPage />} />
      <Route path="/familiespage" element={<FamiliesPage />} />


      </Routes>
    </Suspense>
  );
}
