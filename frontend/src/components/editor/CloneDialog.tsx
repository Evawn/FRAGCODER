import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

interface CloneDialogProps {
  shaderName?: string;
  onClone: () => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloneDialog({ shaderName, onClone, open, onOpenChange }: CloneDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  const handleClone = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call the parent's clone handler
      await onClone();
      handleClose();
    } catch (err: any) {
      console.error('Error cloning shader:', err);
      const message = err.message || 'Failed to clone shader. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-80 bg-gray-800 border-gray-700 text-white p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            Clone Shader
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Create a copy of this shader
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Confirmation Message */}
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-md p-3">
            <p className="text-sm text-blue-300">
              Clone{' '}
              <span className="font-semibold">{shaderName || 'this shader'}</span>?
            </p>
            <p className="text-xs text-blue-400 mt-2">
              A new shader named <span className="font-semibold">"{shaderName || 'Shader'} (Clone)"</span> will be created and you'll be redirected to it.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClone}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Cloning...</span>
                </div>
              ) : (
                'Clone'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
