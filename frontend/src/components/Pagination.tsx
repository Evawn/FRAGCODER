// Compact pagination controls with icon-only buttons for navigating through paginated results
// Displays chevron icons with current page indicator between them
// Buttons are disabled appropriately at boundaries (first/last page)

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <div className="flex items-center gap-2 text-foreground">
      {/* Previous Button - Icon Only */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        className={`p-1 rounded transition-colors ${
          isFirstPage
            ? 'text-foreground-muted cursor-not-allowed'
            : 'text-foreground hover:text-accent hover:bg-background-highlighted'
        }`}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page Indicator */}
      <span className="text-foreground-muted text-xs">
        Page {currentPage} of {totalPages}
      </span>

      {/* Next Button - Icon Only */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        className={`p-1 rounded transition-colors ${
          isLastPage
            ? 'text-foreground-muted cursor-not-allowed'
            : 'text-foreground hover:text-accent hover:bg-background-highlighted'
        }`}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default Pagination;
