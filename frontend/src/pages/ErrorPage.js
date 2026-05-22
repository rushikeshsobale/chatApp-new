import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faHome, faSync } from '@fortawesome/free-solid-svg-icons';

const ErrorPage = ({ 
  darkMode = true, 
  errorCode = "500", 
  errorMessage = "An unexpected error occurred on our end.",
  onRetry, 
  onGoHome 
}) => {
  
  const bgTheme = darkMode ? "bg-dark text-light" : "bg-light text-dark";
  const cardTheme = darkMode ? "bg-secondary text-white border-secondary" : "bg-white text-dark border-light";

  return (
    <div 
      className={`d-flex align-items-center justify-content-center px-3 ${bgTheme}`}
      style={{ 
        height: "100vh", 
        maxHeight: "-webkit-fill-available", // Clean rendering for mobile browsers
        width: "100vw",
        overflow: "hidden"
      }}
    >
      <div 
        className={`card shadow-lg border text-center p-4 p-md-5 rounded-4 mx-auto ${cardTheme}`}
        style={{ maxWidth: "480px", width: "100%" }}
      >
        {/* Error Visual / Icon */}
        <div className="mb-4">
          <div 
            className="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle"
            style={{ width: "80px", height: "80px" }}
          >
            <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
          </div>
        </div>

        {/* Heading & Status Code */}
        <h1 className="fw-black tracking-tight mb-2 display-6">
          Something went wrong
        </h1>
        
        {errorCode && (
          <span className="badge bg-danger bg-opacity-20 text-danger fw-semibold px-2.5 py-1 rounded mb-3 small">
            Error Code: {errorCode}
          </span>
        )}

        {/* Dynamic Context Message */}
        <p className={`mb-4 mx-auto ${darkMode ? 'text-light-50' : 'text-muted'}`} style={{ maxWidth: "340px", fontSize: "0.95rem" }}>
          {errorMessage}
        </p>

        {/* Interactive Functional Options */}
        <div className="d-grid gap-2 d-sm-flex justify-content-sm-center align-items-center mt-2">
          {onRetry && (
            <button 
              onClick={onRetry}
              className="btn btn-success d-flex align-items-center justify-content-center gap-2 py-2 px-4 rounded-3"
              type="button"
            >
              <FontAwesomeIcon icon={faSync} size="sm" />
              <span>Try Again</span>
            </button>
          )}
          
          <button 
            onClick={onGoHome || (() => window.location.href = "/")}
            className={`btn d-flex align-items-center justify-content-center gap-2 py-2 px-4 rounded-3 ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'}`}
            type="button"
          >
            <FontAwesomeIcon icon={faHome} size="sm" />
            <span>Go Back Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;