import React from 'react';

const Loader = ({ text = 'Loading...' }) => (
  <div style={{
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '2rem 0',
  }}>
    <div className="loader-spinner" style={{
      width: 48,
      height: 48,
      border: '5px solid #e0e0e0',
      borderTop: '5px solid #6a82fb',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: 16,
    }} />
    <div style={{ color: '#6a82fb', fontWeight: 500, fontSize: '1.1rem', letterSpacing: 1 }}>{text}</div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export default Loader; 