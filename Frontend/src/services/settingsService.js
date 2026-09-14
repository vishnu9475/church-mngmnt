import api from "../api/client";

/** Church settings API calls. */
export async function updateSettings(settingId, settings) {
  const { data } = await api.patch(`/settings/${settingId}/`, settings);
  return data;
}
