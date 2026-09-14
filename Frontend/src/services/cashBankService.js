import api from "../api/client";

/** Cash deposits, withdrawals, and bank transaction API calls. */
export async function createBankTransaction(transaction) {
  const { data } = await api.post("/bank-transactions/", transaction);
  return data;
}
