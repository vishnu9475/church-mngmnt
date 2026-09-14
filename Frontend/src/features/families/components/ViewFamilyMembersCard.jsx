import { useEffect, useState } from "react";
import MemberCard from "./MemberCard";
import { getFamilyMembers } from "../../../data/dataService";
import PaginationControls from "../../../components/common/PaginationControls";

const PAGE_SIZE = 10;

const toDisplayDate = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${Number(d)}/${Number(m)}/${y}`;
};

// familyId is optional — defaults to showing every member on record.
// Pass a specific family_id (e.g. from route params) to scope this card
// to a single family, matching GET /api/families/:id/members/
const ViewFamilyMembersCard = ({ familyId }) => {
  const [page, setPage] = useState(1);
  const familyMembers = getFamilyMembers(familyId).map((m) => ({
    id: m.member_id,
    name: m.name,
    relation: m.relationship,
    dob: toDisplayDate(m.date_of_birth),
    phone: m.phone,
    email: m.email,
  }));

  useEffect(() => {
    setPage(1);
  }, [familyId, familyMembers.length]);

  const totalPages = Math.max(1, Math.ceil(familyMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMembers = familyMembers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="bg-white border border-gray-300 rounded-xl p-5 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">
        Family Members ({familyMembers.length})
      </h2>

      <div className="space-y-3">
        {paginatedMembers.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      <div className="mt-4">
        <PaginationControls
          page={currentPage}
          pageSize={PAGE_SIZE}
          totalCount={familyMembers.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default ViewFamilyMembersCard;
