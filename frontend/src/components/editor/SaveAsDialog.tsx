import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

interface SaveAsDialogProps {
  onSave: (shaderName: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveAsDialog({ onSave, open, onOpenChange }: SaveAsDialogProps) {
  const [shaderName, setShaderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setShaderName('');
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

  const handleSave = async () => {
    // Validate shader name
    if (!shaderName.trim()) {
      setError('Please enter a shader name');
      return;
    }

    if (shaderName.trim().length < 3) {
      setError('Shader name must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the parent's save handler
      await onSave(shaderName.trim());
      handleClose();
    } catch (err: any) {
      console.error('Error saving shader:', err);
      const message = err.message || 'Failed to save shader. Please try again.';
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
            Save Shader
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Choose a name for your shader
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Shader Name Input */}
          <div className="space-y-2">
            <label htmlFor="shaderName" className="text-sm font-medium text-gray-300">
              Shader Name
            </label>
            <input
              id="shaderName"
              type="text"
              value={shaderName}
              onChange={(e) => setShaderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleSave();
                }
              }}
              placeholder="My Awesome Shader"
              disabled={loading}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              This will be displayed in the shader gallery
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
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading || !shaderName.trim()}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
