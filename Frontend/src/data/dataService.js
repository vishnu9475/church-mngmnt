/**
 * dataService.js
 * ------------------------------------------------------------------
 * All data reads for the app go through this file. Right now every
 * function reads from mockDatabase.js, but each one is written the
 * way a real API call would be — same function name, same return
 * shape. When the Django/MySQL backend is live, swap the body of
 * each function for a `fetch()` call to the matching REST endpoint
 * (suggested routes are noted above each function) and nothing else
 * in the app needs to change.
 *
 * Example of how a function will look after the backend is wired up:
 *
 *   export async function getFamilies() {
 *     const res = await fetch(`${API_BASE_URL}/api/families/`);
 *     return res.json();
 *   }
 *
 * (Every caller already treats these as data sources, so switching
 * them to `async` + `await`/`.then()` at call sites is the only other
 * change needed.)
 * ------------------------------------------------------------------
 */

import api, { API_BASE_URL } from "../api/client";
export { isAuthenticated, login, logout, requestPasswordReset, confirmPasswordReset } from "../services/authService";
export { API_BASE_URL };

let families = [], familyMembers = [], categories = [], paymentMethods = [];
let receipts = [], receiptCategories = [], bills = [], bulkDueCollections = [];
let dues = [], duePayments = [], bankTransactions = [], settings = [];
let familyMonthlyDueRates = [], familyMonthlyPaymentStatuses = [], monthlyCollectionAllocations = [];

/** Backwards-compatible CRUD helper for existing components. */
export async function apiRequest(path, options = {}) {
  try {
    const response = await api.request({
      url: path,
      method: options.method || "GET",
      headers: options.headers,
      data: typeof options.body === "string" ? JSON.parse(options.body) : options.body,
    });
    return response.status === 204 ? null : response.data;
  } catch (error) {
    const detail = error.response?.data;
    throw new Error(typeof detail === "string" ? detail : detail?.detail || JSON.stringify(detail) || error.message);
  }
}

/**
 * Fetch one Django REST Framework page without changing the in-memory
 * bootstrap dataset.  List screens use this for scalable MySQL pagination;
 * summary cards can continue using their existing aggregate data.
 */
export async function getPaginatedList(resource, {
  page = 1,
  pageSize = 25,
  search = "",
  ordering = "",
  filters = {},
} = {}) {
  const parameters = new URLSearchParams({
    page: String(Math.max(1, Number(page) || 1)),
    page_size: String(Math.min(100, Math.max(1, Number(pageSize) || 25))),
  });

  if (search.trim()) parameters.set("search", search.trim());
  if (ordering) parameters.set("ordering", ordering);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      parameters.set(key, String(value));
    }
  });

  const response = await apiRequest(`${resource}/?${parameters.toString()}`);
  const results = Array.isArray(response) ? response : (response?.results || []);

  return {
    count: Number(response?.count ?? results.length),
    next: response?.next ?? null,
    previous: response?.previous ?? null,
    results,
    meta: Array.isArray(response) ? {} : response,
  };
}

export const getBillsPage = (options) =>
  getPaginatedList("bills", { ordering: "-bill_date", ...options });

export const getReceiptsPage = (options) =>
  getPaginatedList("receipts", { ordering: "-receipt_date", ...options });

export const getFamiliesPage = (options) =>
  getPaginatedList("families", { ordering: "family_name", ...options });

export const getBulkDueCollectionsPage = (options) =>
  getPaginatedList("bulk-due-collections", { ordering: "-due_date", ...options });

export const getFamilyDuesStatusPage = (options) =>
  getPaginatedList("family-dues-status", options);

export const getFamilyPaymentTrackerPage = (familyId, options) =>
  getPaginatedList(`families/${familyId}/payment-tracker`, options);

export const getCategoriesPage = (options) =>
  getPaginatedList("categories", { ordering: "category_name", ...options });

const relationId = (row, field) => row?.[field] ?? row?.[field.replace(/_id$/, "")] ?? null;
const numberValue = (value) => Number(value || 0);

/** Load the complete relational dataset from MySQL before React renders. */
export async function initializeData() {
  const data = await apiRequest("bootstrap/");
  families = (data.families || []).map((r) => ({
    ...r,
    monthly_collection_amount: numberValue(r.monthly_collection_amount),
    monthly_dues_opening_balance: numberValue(r.monthly_dues_opening_balance),
  }));
  familyMonthlyDueRates = (data.family_monthly_due_rates || []).map((r) => ({
    ...r,
    family_id: relationId(r, "family_id"),
    amount: numberValue(r.amount),
  }));
  familyMonthlyPaymentStatuses = (data.family_monthly_payment_statuses || []).map((r) => ({
    ...r,
    family_id: relationId(r, "family_id"),
    paid_amount: numberValue(r.paid_amount),
  }));
  monthlyCollectionAllocations = (data.monthly_collection_allocations || []).map((r) => ({
    ...r,
    family_id: relationId(r, "family_id"),
    amount: numberValue(r.amount),
    source_id: Number(r.source_id),
  }));
  familyMembers = (data.family_members || []).map((r) => ({ ...r, family_id: relationId(r, "family_id") }));
  categories = data.categories || [];
  paymentMethods = data.payment_methods || [];
  receipts = (data.receipts || []).map((r) => ({ ...r, amount: numberValue(r.amount), previous_amount: r.previous_amount == null ? null : numberValue(r.previous_amount), edit_count: Number(r.edit_count || 0), previous_payment_method: r.previous_payment_method || null, family_id: relationId(r, "family_id"), primary_category_id: relationId(r, "primary_category_id"), payment_method_id: relationId(r, "payment_method_id") }));
  receiptCategories = (data.receipt_categories || []).map((r) => ({ ...r, receipt_id: relationId(r, "receipt_id"), category_id: relationId(r, "category_id") }));
  bills = (data.bills || []).map((r) => ({
    ...r,
    amount: numberValue(r.amount),
    previous_amount: r.previous_amount == null ? null : numberValue(r.previous_amount),
    edit_count: Number(r.edit_count || 0),
    previous_payment_method: r.previous_payment_method || null,
    category_id: relationId(r, "category_id"),
    payment_method_id: relationId(r, "payment_method_id"),
  }));
  bulkDueCollections = (data.bulk_due_collections || []).map((r) => ({ ...r, amount_per_family: numberValue(r.amount_per_family), category_id: relationId(r, "category_id") }));
  dues = (data.dues || []).map((r) => ({ ...r, amount: numberValue(r.amount), paid_amount: numberValue(r.paid_amount), remaining_amount: numberValue(r.remaining_amount), family_id: relationId(r, "family_id"), collection_id: relationId(r, "collection_id"), category_id: relationId(r, "category_id") }));
  duePayments = (data.due_payments || []).map((r) => ({ ...r, amount: numberValue(r.amount), previous_amount: r.previous_amount == null ? null : numberValue(r.previous_amount), edit_count: Number(r.edit_count || 0), last_edited_by: r.last_edited_by || null, previous_payment_method: r.previous_payment_method || null, due_id: relationId(r, "due_id"), payment_method_id: relationId(r, "payment_method_id") }));
  bankTransactions = (data.bank_transactions || []).map((r) => ({ ...r, amount: numberValue(r.amount) }));
  settings = (data.settings || []).map((r) => ({ ...r, opening_cash: numberValue(r.opening_cash), opening_bank: numberValue(r.opening_bank) }));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("church-data-updated"));
  return data;
}

const currency = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toDisplayDate = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};

const lookupName = (list, idKey, nameKey, id) =>
  list.find((item) => item[idKey] === id)?.[nameKey] || "";

const slugify = (value = "") => String(value)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

// =====================================================
// families  ->  GET /api/families/
// =====================================================
export function getFamilies() {
  return families;
}

export function getFamilyById(familyId) {
  return families.find((family) => family.family_id === Number(familyId));
}

/** Families + their members, shaped exactly as the Families & Members
 * page (Ledger_format_table / Families_members / Add_editfamily) reads
 * from localStorage: {id, familyName, headOfFamily, address, phone,
 * email, amount, members: [{name, relationship, dob, phone, email}]}. */
export function getFamiliesForStorage() {
  return families.map((f) => ({
    id: f.family_id,
    familyName: f.family_name,
    headOfFamily: f.head_of_family,
    address: f.address,
    phone: f.phone,
    email: f.email,
    amount: f.monthly_collection_amount,
    monthlyDuesStartMonth: f.monthly_dues_start_month || "",
    monthlyDuesOpeningBalance: f.monthly_dues_opening_balance || 0,
    members: familyMembers
      .filter((m) => m.family_id === f.family_id)
      .map((m) => ({
        id: m.member_id,
        name: m.name,
        relationship: m.relationship,
        dob: m.date_of_birth,
        phone: m.phone,
        email: m.email,
      })),
  }));
}

/** Ensures localStorage["families"] is seeded from the families table
 * via dataService the first time the Families page loads, instead of
 * silently showing nothing. Safe to call on every render. */
export function ensureFamiliesSeeded() {
  return getFamiliesForStorage();
}

/** Dropdown options for "who is this receipt/due from" pickers, built
 * from the families table (head_of_family + family_name), plus a
 * trailing "Other" option for one-off / non-member payers. */
export function getPayerOptions() {
  return [
    ...families.map((f) => ({
      label: `${f.head_of_family} (${f.family_name})`,
      value: slugify(f.head_of_family),
      familyId: f.family_id,
    })),
    { label: "Other (Custom Name)", value: "other" },
  ];
}

/** Map of payer slug -> monthly_collection_amount, for auto-filling
 * the amount field when a family is picked in Add Receipt. */
export function getMonthlyAmountsBySlug() {
  return families.reduce((map, f) => {
    map[slugify(f.head_of_family)] = f.monthly_collection_amount;
    return map;
  }, {});
}

/** The agreed due for a specific family/month. A saved override wins over the
 * family's default monthly collection amount. `month` is YYYY-MM or YYYY-MM-01. */
export function getMonthlyDueAmount(familyId, month) {
  const normalizedMonth = String(month || "").slice(0, 7);
  const override = familyMonthlyDueRates.find((rate) => (
    Number(rate.family_id) === Number(familyId)
    && String(rate.month || "").slice(0, 7) === normalizedMonth
  ));
  return override ? Number(override.amount || 0) : Number(getFamilyById(familyId)?.monthly_collection_amount || 0);
}

export function getFamilyMonthlyDueRates(familyId) {
  return familyMonthlyDueRates.filter((rate) => Number(rate.family_id) === Number(familyId));
}

export function getFamilyMonthlyPaymentStatuses(familyId) {
  return familyMonthlyPaymentStatuses.filter((status) => Number(status.family_id) === Number(familyId));
}

export function getMonthlyCollectionAllocations(familyId) {
  return monthlyCollectionAllocations.filter((allocation) => Number(allocation.family_id) === Number(familyId));
}

const monthKeysBetween = (startMonth, endMonth) => {
  if (!startMonth || !endMonth || startMonth > endMonth) return [];
  const cursor = new Date(`${String(startMonth).slice(0, 7)}-01T00:00:00`);
  const end = new Date(`${String(endMonth).slice(0, 7)}-01T00:00:00`);
  const months = [];
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

/** One consistent ledger row for each monthly-collection period. Manual
 * reconciliations and allocations from receipts/previous-dues payments are
 * added together; neither path overrides the other. */
export function getMonthlyCollectionRows(familyId, startMonth, endMonth) {
  const manualByMonth = new Map(getFamilyMonthlyPaymentStatuses(familyId)
    .map((entry) => [String(entry.month || "").slice(0, 7), entry]));
  const allocationsByMonth = new Map();
  getMonthlyCollectionAllocations(familyId).forEach((allocation) => {
    const month = String(allocation.month || "").slice(0, 7);
    if (!allocationsByMonth.has(month)) allocationsByMonth.set(month, []);
    allocationsByMonth.get(month).push(allocation);
  });
  return monthKeysBetween(startMonth, endMonth).map((month) => {
    const due = getMonthlyDueAmount(familyId, month);
    const manual = Number(manualByMonth.get(month)?.paid_amount || 0);
    const allocations = allocationsByMonth.get(month) || [];
    const allocated = allocations.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const paid = Math.min(due, manual + allocated);
    return {
      month,
      due,
      paid,
      pending: Math.max(due - paid, 0),
      manual,
      allocations,
      status: paid >= due && due > 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid",
    };
  });
}

/** Live five-year monthly-collection balance. Shared by the tracker and the
 * Edit Family Profile so both places always show the same pending amount. */
export function getMonthlyCollectionPendingTotal(familyId, startMonth) {
  const family = getFamilyById(familyId);
  if (!family) return 0;
  const now = new Date();
  const latest = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const earliestDate = new Date(now.getFullYear() - 4, now.getMonth(), 1);
  const earliest = `${earliestDate.getFullYear()}-${String(earliestDate.getMonth() + 1).padStart(2, "0")}`;
  const configured = String(startMonth || family.monthly_dues_start_month || "").slice(0, 7);
  const firstMonth = configured && configured > earliest ? configured : earliest;
  return getMonthlyCollectionRows(familyId, firstMonth, latest)
    .reduce((sum, row) => sum + row.pending, 0);
}

/** Amount still payable after payments made against the linked Family Due. */
export function getMonthlyCollectionPendingBalance(familyId, startMonth) {
  return getMonthlyCollectionPendingTotal(familyId, startMonth);
}

/** Create/update the linked payable Due from the calculated tracker amount. */
export async function syncMonthlyCollectionPendingDue(familyId, startMonth) {
  const scheduledPending = getMonthlyCollectionPendingTotal(familyId, startMonth);
  await apiRequest(`families/${familyId}/sync-monthly-pending-due/`, {
    method: "POST",
    body: JSON.stringify({ scheduled_pending: scheduledPending }),
  });
  await initializeData();
}

// =====================================================
// family_members  ->  GET /api/families/:id/members/
// =====================================================
export function getFamilyMembers(familyId) {
  if (familyId == null) return familyMembers;
  return familyMembers.filter((m) => m.family_id === Number(familyId));
}

// =====================================================
// categories  ->  GET /api/categories/?type=Receipt|Bill|Due
// =====================================================
export function getCategories(categoryType) {
  if (!categoryType) return categories;
  return categories.filter((c) => c.category_type === categoryType);
}

export function getCategoryName(categoryId) {
  return lookupName(categories, "category_id", "category_name", categoryId);
}

// =====================================================
// payment_methods  ->  GET /api/payment-methods/
// =====================================================
export function getPaymentMethods() {
  return paymentMethods;
}

export function getPaymentMethodName(paymentMethodId) {
  return lookupName(paymentMethods, "payment_method_id", "method_name", paymentMethodId);
}

// =====================================================
// receipts  ->  GET /api/receipts/
// =====================================================
export function getReceipts() {
  return receipts;
}

/** Receipts joined with family/category/payment-method names, plus
 * the category list per receipt — the shape most receipt UI expects. */
export function getReceiptsFormatted() {
  return receipts.map((r) => {
    const storedDescription = r.description || "";
    // Supports the current saved marker and the earlier readable description
    // format used by existing Monthly Collection payment records.
    const periodMatch = storedDescription.match(/^\[Monthly collection period: (\d{4}-\d{2}) to (\d{4}-\d{2})(?:; monthly amount: (\d+(?:\.\d+)?))?\]\s*/)
      || storedDescription.match(/Monthly collection:\s*(\d{4}-\d{2})(?:-\d{2})?\s+to\s+(\d{4}-\d{2})(?:-\d{2})?/i);
    const description = (r.description || "").replace(/^\[Monthly collection period: \d{4}-\d{2} to \d{4}-\d{2}(?:; monthly amount: \d+(?:\.\d+)?)?\]\s*/, "").trim();
    const family = r.family_id ? getFamilyById(r.family_id) : null;
    const payer = family ? family.head_of_family : r.other_payer_name || "Unknown";
    const relatedCategoryIds = receiptCategories
      .filter((rc) => rc.receipt_id === r.receipt_id)
      .map((rc) => rc.category_id);
    const categoryIds = [...new Set([r.primary_category_id, ...relatedCategoryIds].filter(Boolean))];

    return {
      id: r.receipt_id,
      receiptNo: r.receipt_number,
      date: r.receipt_date,
      title: r.title,
      payer,
      payerValue: family ? slugify(family.head_of_family) : "other",
      familyId: r.family_id,
      paymentMethod: getPaymentMethodName(r.payment_method_id),
      amount: r.amount,
      editCount: Number(r.edit_count || 0),
      lastEditedAt: r.last_edited_at || null,
      previousAmount: r.previous_amount == null ? null : Number(r.previous_amount),
      lastEditedBy: r.last_edited_by || null,
      previousPaymentMethod: r.previous_payment_method || null,
      description,
      fromMonth: periodMatch?.[1],
      toMonth: periodMatch?.[2],
      // New multi-category receipts preserve the exact monthly component.
      // Older receipts omit this field and correctly fall back to total amount.
      monthlyCollectionAmount: periodMatch?.[3] == null ? null : Number(periodMatch[3]),
      overdue: false,
      categories: categoryIds.map((cid) => ({
        category: getCategoryName(cid),
        // The schema stores one receipt amount. Assign it to the primary
        // category; linked secondary categories are labels without amounts.
        amount: cid === r.primary_category_id ? Number(r.amount || 0) : 0,
      })),
    };
  });
}

// =====================================================
// bills  ->  GET /api/bills/
// =====================================================
export function getBills() {
  return bills;
}

export function getBillsFormatted() {
  return bills.map((b) => ({
    id: b.bill_id,
    billNo: b.institution_bill_number || b.voucher_number,
    type: b.bill_type,
    date: b.bill_date,
    dueDate: b.due_date,
    title: b.title,
    vendor: b.vendor,
    paymentMethod: getPaymentMethodName(b.payment_method_id),
    category: getCategoryName(b.category_id),
    amount: b.amount,
    status: b.status,
  }));
}

/** Bills grouped by "Month YYYY", shaped to seed BillsManagementPage's
 * editable local state (title/recordNumber/recordType/status/vendor/
 * category/dueDate/description/amount). */
export function getGroupedBillsByMonth() {
  const monthName = (isoDate) =>
    new Date(isoDate).toLocaleString("en-US", { month: "long", year: "numeric" });

  const groups = {};
  [...bills]
    .sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date))
    .forEach((b) => {
      const month = monthName(b.bill_date);
      if (!groups[month]) groups[month] = [];
      groups[month].push({
        id: b.bill_id,
        title: b.title,
        recordNumber: b.institution_bill_number || b.voucher_number,
        recordType: b.bill_type,
        status: b.status,
        vendor: b.vendor,
        category: getCategoryName(b.category_id),
        paymentMethod: getPaymentMethodName(b.payment_method_id),
        dueDate: toDisplayDate(b.due_date),
        description: b.description,
        amount: currency(b.amount),
        editCount: Number(b.edit_count || 0),
        lastEditedAt: b.last_edited_at || null,
        previousAmount: b.previous_amount == null ? null : Number(b.previous_amount),
        lastEditedBy: b.last_edited_by || null,
        previousPaymentMethod: b.previous_payment_method || null,
      });
    });

  return Object.entries(groups).map(([month, bills]) => ({ month, bills }));
}

/** Combines receipts (credits) + bills (debits) into a month-grouped
 * accounting journal — cash vs bank column is picked from the
 * payment_method_id used on each record. Used by AccountingJournal. */
export function getJournalByMonth() {
  const asDate = (isoDate) => new Date(`${isoDate}T00:00:00`);
  const monthKey = (isoDate) =>
    asDate(isoDate).toLocaleString("en-US", { month: "long", year: "numeric" });
  const displayDate = (isoDate) =>
    asDate(isoDate).toLocaleString("en-US", { month: "short", day: "numeric" });

  const entries = [];

  receipts.forEach((r) => {
    if (!r.receipt_date) return;
    const family = r.family_id ? getFamilyById(r.family_id) : null;
    const payer = family ? family.head_of_family : r.other_payer_name || "Unknown";
    const isCash = getPaymentMethodName(r.payment_method_id) === "Cash";
    entries.push({
      date: r.receipt_date,
      month: monthKey(r.receipt_date),
      receiptNo: r.receipt_number,
      voucherNo: null,
      particulars: `${r.title} - ${payer} (${getCategoryName(r.primary_category_id)})`,
      cashAmount: isCash ? r.amount : null,
      bankAmount: isCash ? null : r.amount,
      entryType: "receipt",
    });
  });

  bills.forEach((b) => {
    // Pending and overdue bills are liabilities; only paid bills are cash/bank movements.
    if (!b.bill_date || b.status !== "Paid") return;
    const isCash = getPaymentMethodName(b.payment_method_id) === "Cash";
    entries.push({
      date: b.bill_date,
      month: monthKey(b.bill_date),
      receiptNo: null,
      voucherNo: b.voucher_number || b.institution_bill_number,
      particulars: `${b.title} - ${b.vendor} (${getCategoryName(b.category_id)})`,
      cashAmount: isCash ? -b.amount : null,
      bankAmount: isCash ? null : -b.amount,
      entryType: "bill",
    });
  });

  // Deposits and withdrawals are transfers, not income or expenses. They move
  // the same amount between cash and bank in opposite directions.
  bankTransactions.forEach((transaction) => {
    if (!transaction.transaction_date || !["Deposit", "Withdrawal"].includes(transaction.transaction_type)) return;
    const isDeposit = transaction.transaction_type === "Deposit";
    entries.push({
      date: transaction.transaction_date,
      month: monthKey(transaction.transaction_date),
      receiptNo: null,
      voucherNo: null,
      particulars: `${isDeposit ? "Cash deposited to bank" : "Cash withdrawn from bank"}${transaction.description ? ` - ${transaction.description}` : ""}`,
      cashAmount: isDeposit ? -transaction.amount : transaction.amount,
      bankAmount: isDeposit ? transaction.amount : -transaction.amount,
      entryType: "transfer",
    });
  });

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  const grouped = {};
  entries.forEach((e) => {
    if (!grouped[e.month]) grouped[e.month] = [];
    grouped[e.month].push({
      // Retain the ISO date for filters and exports. `date` remains the
      // human-friendly label used by the on-screen ledger table.
      entryDate: e.date,
      date: displayDate(e.date),
      receiptNo: e.receiptNo,
      voucherNo: e.voucherNo,
      particulars: e.particulars,
      cashAmount: e.cashAmount,
      bankAmount: e.bankAmount,
      entryType: e.entryType,
    });
  });

  const sortedMonths = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
  const configuredSettings = getSettings();
  const result = {};
  let runningCash = numberValue(configuredSettings.opening_cash);
  let runningBank = numberValue(configuredSettings.opening_bank);
  sortedMonths.forEach((month) => {
    const transactions = grouped[month];
    result[month] = {
      openingCashBalance: runningCash,
      openingBankBalance: runningBank,
      transactions,
    };
    runningCash += transactions.reduce((total, item) => total + numberValue(item.cashAmount), 0);
    runningBank += transactions.reduce((total, item) => total + numberValue(item.bankAmount), 0);
  });

  return result;
}

// =====================================================
// bulk_due_collections  ->  GET /api/bulk-due-collections/
// =====================================================
export function getBulkDueCollections() {
  return bulkDueCollections;
}

// =====================================================
// dues + due_payments  ->  GET /api/dues/ , GET /api/due-payments/
// =====================================================
export function getDues() {
  return dues;
}

export function getPaidAmountForDue(dueId) {
  return duePayments
    .filter((p) => p.due_id === dueId)
    .reduce((sum, p) => sum + p.amount, 0);
}

/** Dues joined with family + payment status — what due/payment-tracker
 * UIs need (family name, contact, paid amount, remaining, status). */
export function getDuesFormatted(collectionId) {
  const rows = collectionId
    ? dues.filter((d) => d.collection_id === collectionId)
    : dues;

  return rows.map((d) => {
    const family = getFamilyById(d.family_id);
    const paid = getPaidAmountForDue(d.due_id);
    const remaining = Math.max(d.amount - paid, 0);
    const status = paid <= 0 ? "Unpaid" : remaining > 0 ? "Partial" : "Paid";

    return {
      dueId: d.due_id,
      sl: d.due_id,
      familyId: d.family_id,
      family: family ? family.family_name : "Unknown Family",
      person: family ? family.head_of_family : "Unknown",
      dueTitle: d.title,
      dueDate: toDisplayDate(d.due_date),
      amount: currency(d.amount),
      paid: currency(paid),
      remaining: currency(remaining),
      status,
      statusTone: status.toLowerCase(),
    };
  });
}

export function getDuePayments() {
  return duePayments;
}

/** Per-family dues status: monthly collection progress + outstanding
 * bulk dues, combined into one row per family. Used by
 * FamilyDuesStatus / UnpaidDuesList style tables. */
export function getFamilyDuesStatus() {
  return families.map((f) => {
    const monthlyCategoryId = categories.find((c) => c.category_name === "Monthly Collection")?.category_id;
    const monthlyPaid = receipts
      .filter((r) => r.family_id === f.family_id && r.primary_category_id === monthlyCategoryId)
      .reduce((sum, r) => sum + r.amount, 0);

    const monthlyStatus =
      monthlyPaid >= f.monthly_collection_amount ? "Paid" : monthlyPaid > 0 ? "Partial" : "Unpaid";

    const familyDues = dues.filter((d) => d.family_id === f.family_id);
    const outstandingDueTitles = [
      ...new Set(
        familyDues
          .filter((d) => getPaidAmountForDue(d.due_id) < d.amount)
          .map((d) => d.title)
      ),
    ];

    const duesPaid = familyDues.reduce((sum, d) => sum + getPaidAmountForDue(d.due_id), 0);
    const duesRemaining = familyDues.reduce(
      (sum, d) => sum + Math.max(d.amount - getPaidAmountForDue(d.due_id), 0),
      0
    );
    const monthlyRemaining = Math.max(f.monthly_collection_amount - monthlyPaid, 0);

    return {
      familyId: f.family_id,
      familyName: f.family_name,
      headOfFamily: f.head_of_family,
      monthlyDue: f.monthly_collection_amount,
      monthlyPaid,
      monthlyStatus,
      otherDues: outstandingDueTitles.length ? outstandingDueTitles.join(", ") : "None",
      totalPaid: monthlyPaid + duesPaid,
      totalDue: monthlyRemaining + duesRemaining,
    };
  });
}

/** Pending dues for one family, shaped as {id, title, status, category,
 * dueDate, totalAmount, paid, remaining, description} — the editable
 * shape FamilyPendingDues (Abhijith) seeds its local state with. */
export function getPendingDuesForFamily(familyId) {
  return dues
    .filter((d) => d.family_id === Number(familyId))
    .map((d) => {
      const paid = getPaidAmountForDue(d.due_id);
      const remaining = Math.max(d.amount - paid, 0);
      const status = paid <= 0 ? "pending" : remaining > 0 ? "partial" : "paid";
      return {
        id: d.due_id,
        title: d.title,
        status,
        category: getCategoryName(d.category_id) || "Uncategorized Due",
        dueDate: toDisplayDate(d.due_date),
        totalAmount: d.amount,
        paid,
        remaining,
        description: d.description || "",
      };
    });
}

/** Raw dues for one family, shaped as {title, amount, dueDate} — the
 * minimal editable shape FamilyPaymentTracker seeds its local state
 * with (state stays editable client-side; this only sets the initial
 * values instead of unconnected placeholders). */
export function getDuesForFamily(familyId) {
  return dues
    .filter((d) => d.family_id === Number(familyId))
    .map((d) => ({
      dueId: d.due_id,
      title: d.title,
      amount: d.amount,
      dueDate: d.due_date,
    }));
}

// =====================================================
// bank_transactions  ->  GET /api/bank-transactions/
// =====================================================
export function getBankTransactions() {
  return bankTransactions;
}

/** Cash-in-hand / bank-balance summary, derived from opening balances
 * (settings) plus all cash vs non-cash receipts, bills, and bank
 * deposit/withdrawal transactions. Used by CurrentBalances,
 * TransactionSummary, DepositStatistics. */
export function getCashBankSummary() {
  const s = getSettings();
  const isCash = (paymentMethodId) => getPaymentMethodName(paymentMethodId) === "Cash";

  const cashReceipts = receipts.filter((r) => isCash(r.payment_method_id)).reduce((sum, r) => sum + numberValue(r.amount), 0);
  const bankReceipts = receipts.filter((r) => !isCash(r.payment_method_id)).reduce((sum, r) => sum + numberValue(r.amount), 0);
  // A pending/overdue bill is a liability, not an actual payment. Cash and
  // bank availability must only be reduced after the bill is marked Paid.
  const paidBills = bills.filter((b) => b.status === "Paid");
  const cashBills = paidBills.filter((b) => isCash(b.payment_method_id)).reduce((sum, b) => sum + numberValue(b.amount), 0);
  const bankBills = paidBills.filter((b) => !isCash(b.payment_method_id)).reduce((sum, b) => sum + numberValue(b.amount), 0);

  const totalDeposits = bankTransactions.filter((t) => t.transaction_type === "Deposit").reduce((sum, t) => sum + numberValue(t.amount), 0);
  const totalWithdrawals = bankTransactions.filter((t) => t.transaction_type === "Withdrawal").reduce((sum, t) => sum + numberValue(t.amount), 0);

  // Deposits transfer cash to bank; withdrawals transfer bank funds back to
  // cash. They must affect both sides of the summary.
  const cashInHand = numberValue(s.opening_cash) + cashReceipts - cashBills - totalDeposits + totalWithdrawals;
  const bankBalance = numberValue(s.opening_bank) + bankReceipts - bankBills + totalDeposits - totalWithdrawals;

  return {
    openingCash: currency(s.opening_cash),
    openingBank: currency(s.opening_bank),
    cashInHand: currency(cashInHand),
    bankBalance: currency(bankBalance),
    cashReceipts,
    bankReceipts,
    cashBills,
    bankBills,
    totalDeposits,
    totalWithdrawals,
    cashInHandRaw: cashInHand,
    bankBalanceRaw: bankBalance,
  };
}

/** Credits & Debits statement rows (opening cash + receipts as credits;
 * opening bank + bills as debits), optionally filtered by date range and
 * category — matches the shape ReportFilters/CreditsDebits use. */
export function getCreditsDebitsStatement(filters = {}) {
  const { fromDate, toDate, receiptCategory, billCategory, includeOpeningCash, includeOpeningBank } = filters;
  const s = getSettings();

  const inRange = (isoDate) => {
    if (fromDate && isoDate < fromDate) return false;
    if (toDate && isoDate > toDate) return false;
    return true;
  };

  const creditRows = [
    { sl: "-", particular: "Opening Cash Balance", amount: s.opening_cash, show: includeOpeningCash !== false },
    ...receipts
      .filter((r) => inRange(r.receipt_date))
      .filter((r) => !receiptCategory || receiptCategory === "All Categories" || getCategoryName(r.primary_category_id) === receiptCategory)
      .map((r, idx) => {
        const family = r.family_id ? getFamilyById(r.family_id) : null;
        const payer = family ? family.head_of_family : r.other_payer_name || "Unknown";
        return {
          sl: idx + 1,
          particular: `${r.title} - ${payer}`,
          amount: r.amount,
          show: true,
        };
      }),
  ];

  const debitRows = [
    { sl: "-", particular: "Opening Bank Balance", amount: s.opening_bank, show: includeOpeningBank !== false },
    ...bills
      .filter((b) => b.status === "Paid")
      .filter((b) => inRange(b.bill_date))
      .filter((b) => !billCategory || billCategory === "All Categories" || getCategoryName(b.category_id) === billCategory)
      .map((b, idx) => ({
        sl: idx + 1,
        particular: `${b.title} - ${b.vendor}`,
        amount: b.amount,
        show: true,
      })),
  ];

  return { creditRows, debitRows };
}

// =====================================================
// settings  ->  GET /api/settings/  (single row)
// =====================================================
export function getSettings() {
  return settings[0] || { opening_cash: 0, opening_bank: 0 };
}

/** Most recent bank deposits, shaped for RecentDeposits /
 * IndividualDeposit (personName/date/depositType/amount). */
export function getRecentDeposits(limit = 5) {
  return bankTransactions
    .filter((t) => t.transaction_type === "Deposit")
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
    .slice(0, limit)
    .map((t) => ({
      personName: t.deposited_by,
      date: toDisplayDate(t.transaction_date),
      depositType: t.description,
      amount: t.amount.toFixed(2),
    }));
}

/** Deposit count/total/average, derived from bank_transactions where
 * transaction_type is "Deposit". Used by DepositStatistics. */
export function getDepositStatistics() {
  const deposits = bankTransactions.filter((t) => t.transaction_type === "Deposit");
  const total = deposits.reduce((sum, t) => sum + t.amount, 0);
  const average = deposits.length ? total / deposits.length : 0;

  return {
    count: deposits.length,
    total: currency(total),
    average: currency(average),
  };
}

// =====================================================
// Derived / dashboard-level aggregates
// (would likely be their own summary endpoint, e.g. GET /api/dashboard/summary/)
// =====================================================
export function getDashboardTotals() {
  const totalCredit = receipts.reduce((sum, r) => sum + numberValue(r.amount), 0);
  // An unpaid or overdue bill is a liability, not an expense already paid
  // from cash/bank. Match the dashboard with Cash & Bank and the reports.
  const paidBills = bills.filter((bill) => bill.status === "Paid");
  const totalDebit = paidBills.reduce((sum, bill) => sum + numberValue(bill.amount), 0);
  const netBalance = totalCredit - totalDebit;
  const pendingBills = bills.filter((b) => b.status !== "Paid").length;
  const paidBillCount = paidBills.length;

  return {
    totalCredit: currency(totalCredit),
    totalDebit: currency(totalDebit),
    netBalance: currency(netBalance),
    pendingBills,
    receiptCount: receipts.length,
    paidBillCount,
    balanceLabel: netBalance >= 0 ? "Surplus" : "Deficit",
  };
}

export function getRecentReceipts(limit = 6) {
  return [...receipts]
    .sort((a, b) => new Date(b.receipt_date) - new Date(a.receipt_date))
    .slice(0, limit)
    .map((r) => {
      const family = r.family_id ? getFamilyById(r.family_id) : null;
      return {
        id: r.receipt_id,
        title: r.title,
        subtitle: family ? family.head_of_family : r.other_payer_name || "Unknown",
        amount: currency(r.amount),
        status: getPaymentMethodName(r.payment_method_id),
        date: toDisplayDate(r.receipt_date),
      };
    });
}

export function getRecentBills(limit = 6) {
  return [...bills]
    .sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date))
    .slice(0, limit)
    .map((b) => ({
      id: b.bill_id,
      title: b.title,
      subtitle: b.vendor,
      amount: currency(b.amount),
      status: b.status,
      date: toDisplayDate(b.bill_date),
    }));
}

/** Receipts under the "Monthly Collection" category — used by the
 * category-wise annual report. */
export function getMonthlyCollectionReceipts() {
  return getReceiptsByCategoryName("Monthly Collection");
}

/** Generic: receipts under a given category name, shaped for the
 * SL/receiptNo/date/title/payer/paymentMethod/amount report tables
 * used across the akbar category-report components. */
export function getReceiptsByCategoryName(categoryName) {
  return receipts
    .filter((r) => r.primary_category_id === categories.find((c) => c.category_name === categoryName)?.category_id)
    .map((r, idx) => {
      const family = r.family_id ? getFamilyById(r.family_id) : null;
      return {
        id: idx + 1,
        receiptNo: r.receipt_number,
        date: toDisplayDate(r.receipt_date),
        title: r.title,
        payer: family ? family.head_of_family : r.other_payer_name || "Unknown",
        paymentMethod: getPaymentMethodName(r.payment_method_id),
        amount: r.amount.toFixed(2),
      };
    });
}

/** Receipts under "Building Fund" / "Mission Fund" — used by
 * IncomeByCategory (special offerings report). */
export function getSpecialOfferingsReceipts() {
  return getReceiptsFormatted().filter((r) =>
    r.categories.some((c) => c.category === "Building Fund" || c.category === "Mission Fund")
  );
}

/** Bills under "Utilities" / "Maintenance" / "Supplies" — used by
 * ExpensesByCategory. */
export function getUtilitiesBills() {
  return getBillsFormatted().filter((b) =>
    ["Utilities", "Maintenance", "Supplies"].includes(b.category)
  );
}

/** Bills shaped for the akbar-style expense report tables
 * (billNo/type/date/title/vendor/paymentMethod/amount). */
export function getBillsByCategoryNames(categoryNames) {
  return bills
    .filter((b) => categoryNames.includes(getCategoryName(b.category_id)))
    .map((b, idx) => ({
      id: idx + 1,
      billNo: b.institution_bill_number || b.voucher_number,
      type: b.bill_type,
      date: toDisplayDate(b.bill_date),
      title: b.title,
      vendor: b.vendor,
      paymentMethod: getPaymentMethodName(b.payment_method_id),
      amount: b.amount.toFixed(2),
    }));
}

/** Receipts shaped for the akbar-style income report tables, filtered
 * to any of the given category names (used by IncomeByCategory for
 * "Building Fund" + "Mission Fund" special offerings). */
export function getReceiptsByCategoryNames(categoryNames) {
  return receipts
    .filter((r) => categoryNames.includes(getCategoryName(r.primary_category_id)))
    .map((r, idx) => {
      const family = r.family_id ? getFamilyById(r.family_id) : null;
      return {
        id: idx + 1,
        receiptNo: r.receipt_number,
        date: toDisplayDate(r.receipt_date),
        title: r.title,
        payer: family ? family.head_of_family : r.other_payer_name || "Unknown",
        paymentMethod: getPaymentMethodName(r.payment_method_id),
        amount: r.amount.toFixed(2),
      };
    });
}

/** Convenience: dues rows shaped for DuesreportCard, grouped by
 * bulk collection title. */
export function getDuesReportByCollectionTitle(title) {
  const collection = bulkDueCollections.find((c) => c.title === title);
  if (!collection) return [];
  // This report is for outstanding balances only. Fully paid dues remain in
  // payment history, but are intentionally excluded from the report table
  // and from the PDF generated from these report rows.
  return getDuesFormatted(collection.collection_id).filter(
    (due) => due.statusTone === "unpaid" || due.statusTone === "partial"
  );
}

/** Outstanding (unpaid/partial) dues for one Due-category. Bulk due
 * collections carry the category reference, so Bill and Receipt categories
 * are never included in this report. */
export function getDuesReportByCategoryId(categoryId) {
  const collectionIds = new Set(
    bulkDueCollections
      .filter((collection) => String(collection.category_id) === String(categoryId))
      .map((collection) => collection.collection_id)
  );

  return getDuesFormatted().filter((due) => {
    const sourceDue = dues.find((item) => item.due_id === due.dueId);
    return (String(sourceDue?.category_id) === String(categoryId)
      || collectionIds.has(sourceDue?.collection_id))
      && (due.statusTone === "unpaid" || due.statusTone === "partial");
  });
}

/** Totals + progress line for a bulk collection's dues, used by
 * DuesreportCard's summary strip. */
export function getDuesSummaryByCollectionTitle(title) {
  const collection = bulkDueCollections.find((c) => c.title === title);
  if (!collection) {
    return { totalAmount: currency(0), totalPaid: currency(0), remaining: currency(0), progress: "0/0 Fully Paid" };
  }
  const collectionDues = dues.filter((d) => d.collection_id === collection.collection_id);
  const totalAmount = collectionDues.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = collectionDues.reduce((sum, d) => sum + getPaidAmountForDue(d.due_id), 0);
  const remaining = Math.max(totalAmount - totalPaid, 0);
  const fullyPaidCount = collectionDues.filter(
    (d) => getPaidAmountForDue(d.due_id) >= d.amount
  ).length;

  return {
    totalAmount: currency(totalAmount),
    totalPaid: currency(totalPaid),
    remaining: currency(remaining),
    progress: `${fullyPaidCount}/${collectionDues.length} Fully Paid • ${currency(totalPaid)} Paid Pending ${currency(remaining)}`,
  };
}

/** Summary for outstanding dues under one Due-category. */
export function getDuesSummaryByCategoryId(categoryId) {
  const collectionIds = new Set(
    bulkDueCollections
      .filter((collection) => String(collection.category_id) === String(categoryId))
      .map((collection) => collection.collection_id)
  );
  const categoryDues = dues.filter((due) => (
    String(due.category_id) === String(categoryId)
    || collectionIds.has(due.collection_id)
  ));
  const outstandingDues = categoryDues.filter((due) => getPaidAmountForDue(due.due_id) < due.amount);
  const totalAmount = outstandingDues.reduce((sum, due) => sum + due.amount, 0);
  const totalPaid = outstandingDues.reduce((sum, due) => sum + getPaidAmountForDue(due.due_id), 0);
  const remaining = outstandingDues.reduce((sum, due) => sum + Math.max(due.amount - getPaidAmountForDue(due.due_id), 0), 0);

  return {
    totalAmount: currency(totalAmount),
    totalPaid: currency(totalPaid),
    remaining: currency(remaining),
    progress: `${outstandingDues.length} outstanding due${outstandingDues.length === 1 ? "" : "s"} • ${currency(remaining)} remaining`,
  };
}
