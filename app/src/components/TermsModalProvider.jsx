// src/components/TermsModalProvider.jsx
import React, { createContext, useCallback, useContext, useState } from "react";
import TermsAcceptanceModal from "./TermsAcceptanceModal";

const TermsModalContext = createContext({
  openTermsModal: () => {},
});

export const useTermsModal = () => useContext(TermsModalContext);

/**
 * Wraps its children and renders a single instance of TermsAcceptanceModal.
 * Anywhere inside, call `useTermsModal().openTermsModal()` to force it open
 * (e.g. from a red banner on the Profile page).
 */
export const TermsModalProvider = ({ children }) => {
  const [forceOpen, setForceOpen] = useState(false);

  const openTermsModal = useCallback(() => setForceOpen(true), []);
  const closeTermsModal = useCallback(() => setForceOpen(false), []);

  return (
    <TermsModalContext.Provider value={{ openTermsModal }}>
      {children}
      <TermsAcceptanceModal
        forceOpen={forceOpen}
        onForceClose={closeTermsModal}
      />
    </TermsModalContext.Provider>
  );
};