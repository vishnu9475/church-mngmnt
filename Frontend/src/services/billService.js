import api from "../api/client";

/** Bills Management API calls. */
export async function createBill(bill) {
  const { data } = await api.post("/bills/", bill);
  return data;
}

export async function updateBill(billId, bill) {
  const { data } = await api.patch(`/bills/${billId}/`, bill);
  return data;
}

export async function deleteBill(billId) {
  await api.delete(`/bills/${billId}/`);
}
