import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { CategoryStatus } from './CategoryStatus';
import AddNewBillCategory from './AddNewBillCategory';
import BillCategories from './BillCategories';
import { createCategory, getCategoriesPage } from '../../../services/categoryService';

const PAGE_SIZE = 25;
const toCategoryCard = (category) => ({
  id: category.category_id,
  title: category.category_name,
  description: category.description,
});

export const CategoryManagement = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('bills'); // 'bills' or 'receipts'

  const [categories, setCategories] = useState([]);
  const [billCount, setBillCount] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [toast, setToast] = useState({ show: false, message: '' });

  
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '' });
      }, 2000);

      return () => clearTimeout(timer); 
    }
  }, [toast.show]);

  
  const categoryType = activeTab === 'bills' ? 'Bill' : 'Receipt';

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError('');
    Promise.all([
      getCategoriesPage({ page, pageSize: PAGE_SIZE, filters: { category_type: categoryType } }),
      getCategoriesPage({ page: 1, pageSize: 1, filters: { category_type: 'Bill' } }),
      getCategoriesPage({ page: 1, pageSize: 1, filters: { category_type: 'Receipt' } }),
    ])
      .then(([visible, bills, receipts]) => {
        if (!active) return;
        setCategories(visible.results.map(toCategoryCard));
        setBillCount(bills.count);
        setReceiptCount(receipts.count);
      })
      .catch((error) => {
        if (!active) return;
        setCategories([]);
        setLoadError(error.message || 'Unable to load categories.');
      })
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [categoryType, page, reloadKey]);

  const refreshCategories = async () => setReloadKey((value) => value + 1);

  const handleAddNewCategory = async newCategory => {
    await createCategory({ category_name: newCategory.title, category_type: activeTab === 'bills' ? 'Bill' : 'Receipt', description: newCategory.description });
    await refreshCategories();
    setToast({
      show: true,
      message: `"${newCategory.title}" successfully added!`,
    });
  };

  return (
    <div className="w-full relative space-y-5 font-sans antialiased text-[#0f172a] bg-[#f9fafc]">
      {/* Header */}
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-bold text-[#0f172a] sm:text-[24px]">
            Category Management
          </h1>
          <p className="text-[14px] text-[#6a727c] mt-[2px]">
            Manage categories for bills and receipts
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex h-[40px] w-full shrink-0 items-center justify-center gap-1.5 self-start whitespace-nowrap rounded-[8px] bg-[#03060a] px-[14px] text-[15px] font-semibold text-white transition-colors hover:bg-opacity-90 sm:mt-[8px] sm:mr-[8px] sm:h-[36px] sm:w-auto sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Category
        </button>
      </div>

     
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 w-full">
        <CategoryStatus title="Bill Categories" count={billCount} />
        <CategoryStatus
          title="Receipt Categories"
          count={receiptCount}
        />
      </div>

      {/* 1. Master Tab Switcher Bar */}
      <div className="mt-6 flex h-auto w-full items-center rounded-2xl bg-[#eef2f6] p-[4px] sm:h-[40px] sm:rounded-full">
        <button
          type="button"
          onClick={() => { setActiveTab('bills'); setPage(1); }}
          className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-center text-xs font-medium transition-all duration-150 sm:rounded-full sm:px-3 sm:text-[14px] ${
            activeTab === 'bills'
              ? 'bg-white text-[#0f172a] shadow-sm'
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          Bill Categories
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('receipts'); setPage(1); }}
          className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-center text-xs font-medium transition-all duration-150 sm:rounded-full sm:px-3 sm:text-[14px] ${
            activeTab === 'receipts'
              ? 'bg-white text-[#0f172a] shadow-sm'
              : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          Receipt Categories
        </button>
      </div>

      
      <div className="w-full bg-white border border-[#e2e8f0] rounded-[21px] p-4 sm:p-7 shadow-sm">
        <h2 className="text-[16px] font-medium text-[#0f172a] mb-5 tracking-tight capitalize">
          {activeTab === 'bills' ? 'Bill' : 'Receipt'} Categories
        </h2>

        
        {loadError ? (
          <p className="py-10 text-center text-sm text-red-600">{loadError}</p>
        ) : isLoading ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading categories…</p>
        ) : (
          <BillCategories
            activeTab={activeTab}
            categories={categories}
            totalCount={activeTab === 'bills' ? billCount : receiptCount}
            page={page}
            onPageChange={setPage}
            onRefresh={refreshCategories}
          />
        )}
      </div>

     
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsAddModalOpen(false)}
            className="fixed inset-0 bg-black/40 "
          />
          <div className="relative z-10 w-full flex justify-center">
            <AddNewBillCategory
              onClose={() => setIsAddModalOpen(false)}
              activeTab={activeTab}
              onAddCategory={handleAddNewCategory}
            />
          </div>
        </div>
      )}

      {/* Minimal Top Center Popup Alert Layout */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-full shadow-lg transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
          {/* Clean Success Ring Icon */}
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-3 h-3 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Message Text */}
          <span className="text-[13.5px] font-medium text-slate-100 tracking-wide pr-1">
            {toast.message}
          </span>
        </div>
      )}
    </div>
  );
};
