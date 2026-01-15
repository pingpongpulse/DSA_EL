import React, { useCallback } from 'react';
import '../styles/ExportButton.css';

function ExportButton({ pageContent, pageNumber }) {
  const handleDownload = useCallback(() => {
    // Create a clean text version by stripping HTML tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pageContent;
    const plainText = tempDiv.innerText || tempDiv.textContent || '';

    // Create blob and download
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `note-page-${pageNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [pageContent, pageNumber]);

  return (
    <button
      className="export-btn"
      onClick={handleDownload}
      title="Download as .txt"
      aria-label="Download page as text file"
    >
      ⬇ Download
    </button>
  );
}

export default ExportButton;
