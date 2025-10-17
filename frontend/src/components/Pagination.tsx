// Pagination controls component for navigating through paginated results
// Displays "< Previous", current page indicator, and "Next >" buttons
// Buttons are disabled appropriately at boundaries (first/last page)

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <div className="flex items-center gap-4 text-foreground">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        className={`px-3 py-1 rounded transition-colors ${
          isFirstPage
            ? 'text-foreground-muted cursor-not-allowed'
            : 'text-foreground hover:text-accent hover:bg-background-highlighted'
        }`}
      >
        &lt; Previous
      </button>

      {/* Page Indicator */}
      <span className="text-foreground-muted">
        Page {currentPage} of {totalPages}
      </span>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        className={`px-3 py-1 rounded transition-colors ${
          isLastPage
            ? 'text-foreground-muted cursor-not-allowed'
            : 'text-foreground hover:text-accent hover:bg-background-highlighted'
        }`}
      >
        Next &gt;
      </button>
    </div>
  );
}

export default Pagination;
