import api from "../api/client";

/** Families and family-member API calls. */
export async function createFamily(family) {
  const { data } = await api.post("/families/", family);
  return data;
}

export async function updateFamily(familyId, family) {
  const { data } = await api.patch(`/families/${familyId}/`, family);
  return data;
}

export async function deleteFamily(familyId) {
  await api.delete(`/families/${familyId}/`);
}

export async function createFamilyMember(member) {
  const { data } = await api.post("/family-members/", member);
  return data;
}

export async function deleteFamilyMember(memberId) {
  await api.delete(`/family-members/${memberId}/`);
}
