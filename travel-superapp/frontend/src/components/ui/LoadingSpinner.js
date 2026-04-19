import React from 'react';
import '../../styles/spinner.css';

export default function LoadingSpinner({ fullPage = false, size = 'md' }) {
  const spinner = (
    <div
      className={`spinner spinner--${size}`}
      role="status"
      aria-label="Loading"
    >
      <div className="spinner-ring" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="spinner-fullpage" aria-live="polite">
        {spinner}
      </div>
    );
  }

  return spinner;
}
