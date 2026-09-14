import api from "../api/client";

/** Dues, payments, and bulk-dues API calls. */
export async function createDue(due) {
  const { data } = await api.post("/dues/", due);
  return data;
}

export async function updateDue(dueId, due) {
  const { data } = await api.patch(`/dues/${dueId}/`, due);
  return data;
}

export async function deleteDue(dueId) {
  await api.delete(`/dues/${dueId}/`);
}

export async function createDuePayment(payment) {
  const { data } = await api.post("/due-payments/", payment);
  return data;
}

export async function updateDuePayment(paymentId, payment) {
  const { data } = await api.patch(`/due-payments/${paymentId}/`, payment);
  return data;
}

export async function deleteDuePayment(paymentId) {
  await api.delete(`/due-payments/${paymentId}/`);
}

export async function createBulkDueCollection(collection) {
  const { data } = await api.post("/bulk-due-collections/", collection);
  return data;
}

export async function setFinancialYearMonthlyRate(rate) {
  const { data } = await api.post("/family-monthly-due-rates/set-financial-year/", rate);
  return data;
}

export async function saveMonthlyPaymentStatus(statusId, status) {
  const request = statusId
    ? api.patch(`/family-monthly-payment-statuses/${statusId}/`, status)
    : api.post("/family-monthly-payment-statuses/", status);
  const { data } = await request;
  return data;
}
