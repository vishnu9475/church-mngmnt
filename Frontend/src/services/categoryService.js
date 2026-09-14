import api from "../api/client";

/** Category Management API calls. */
export async function getCategoriesPage({
  page = 1,
  pageSize = 25,
  search = "",
  ordering = "category_name",
  filters = {},
} = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search.trim()) params.set("search", search.trim());
  if (ordering) params.set("ordering", ordering);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });

  const { data } = await api.get("/categories/", { params });
  return data;
}

export async function createCategory(category) {
  const { data } = await api.post("/categories/", category);
  return data;
}

export async function updateCategory(categoryId, category) {
  const { data } = await api.patch(`/categories/${categoryId}/`, category);
  return data;
}

export async function deleteCategory(categoryId) {
  await api.delete(`/categories/${categoryId}/`);
}
