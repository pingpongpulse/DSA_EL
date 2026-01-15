import React, { useCallback } from 'react';
import '../styles/PageManager.css';

function PageManager({ currentPage, totalPages, onPageChange, onAddPage, onDeletePage }) {
  const handlePrevious = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handleNewPage = useCallback(() => {
    onAddPage();
  }, [onAddPage]);

  const handleDelete = useCallback(() => {
    if (totalPages > 1) {
      onDeletePage(currentPage);
    }
  }, [currentPage, totalPages, onDeletePage]);

  return (
    <div className="page-manager">
      <div className="page-controls-left">
        <button
          className="page-btn prev-btn"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          title="Previous Page"
          aria-label="Previous page"
        >
          ← Prev
        </button>
        <span className="page-indicator">
          Page <span className="page-number">{currentPage}</span> of <span className="total-pages">{totalPages}</span>
        </span>
        <button
          className="page-btn next-btn"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          title="Next Page"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>

      <div className="page-controls-right">
        <button
          className="page-btn add-btn"
          onClick={handleNewPage}
          title="Add New Page"
          aria-label="Add new page"
        >
          + New Page
        </button>
        <button
          className="page-btn delete-btn"
          onClick={handleDelete}
          disabled={totalPages === 1}
          title="Delete Current Page"
          aria-label="Delete current page"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default PageManager;
