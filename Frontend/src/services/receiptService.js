import api from "../api/client";

/** Receipts Management API calls. */
export async function createReceipt(receipt) {
  const { data } = await api.post("/receipts/", receipt);
  return data;
}

export async function updateReceipt(receiptId, receipt) {
  const { data } = await api.patch(`/receipts/${receiptId}/`, receipt);
  return data;
}

export async function deleteReceipt(receiptId) {
  await api.delete(`/receipts/${receiptId}/`);
}

export async function addReceiptCategory(receiptId, categoryId) {
  const { data } = await api.post("/receipt-categories/", {
    receipt: receiptId,
    category: categoryId,
  });
  return data;
}
