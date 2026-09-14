import { useState } from "react";
import Sidemenu from "../../../components/common/Sidemenu";
import AccountingJournal from "../components/AccountingJournal";

export default function JournalPage() {
  return (
    <>
      <style>{`
        /* Sidebar layout spacer — ONLY takes up space on desktop (1024px and up) */
        .j-sidebar-wrapper {
          width: 232px; /* w-58 match */
          flex-shrink: 0;
        }
        
        /* On mobile/tablets, completely remove the spacer so content pushes to the left edge */
        @media (max-width: 1023px) {
          .j-sidebar-wrapper { 
            display: none; 
          }
        }

        /* Container to make sure content behaves and stretches full width on mobile */
        .j-content-container {
          flex: 1;
          min-width: 0;
          width: 100%;
        }
      `}</style>

      
      <div className="min-h-screen w-full bg-gray-50 lg:flex">
        
        
        <Sidemenu />
        
        
        <div className="j-sidebar-wrapper" />

        
        <div className="j-content-container">
          <AccountingJournal />
        </div>

      </div>
    </>
  );
}
