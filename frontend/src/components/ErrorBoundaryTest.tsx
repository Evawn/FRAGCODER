/**
 * Test component for Error Boundary - throws error on button click.
 * FOR TESTING ONLY - Remove before production deployment.
 */
import { useState } from 'react';

export function ErrorBoundaryTest() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Test error thrown by ErrorBoundaryTest component');
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShouldThrow(true)}
        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium shadow-lg"
      >
        Test Error Boundary
      </button>
    </div>
  );
}
