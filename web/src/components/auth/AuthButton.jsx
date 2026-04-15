import React from 'react';
import { LoaderCircle } from 'lucide-react';

export const AuthMainButton = ({ children, onClick, loading, icon }) => {
  return (
    <button className="btn btn-primary animated-item" onClick={onClick} disabled={loading} type="button">
      {loading ? (
        <LoaderCircle size={18} strokeWidth={2.2} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        <>
          {children}
          {icon || (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          )}
        </>
      )}
    </button>
  );
};
