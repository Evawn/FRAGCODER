import { useState, useEffect } from 'react';
import { ActionDialog } from '../ui/ActionDialog';
import { useDialogState } from '../../hooks/useDialogState';

interface RenameDialogProps {
  currentName?: string;
  onRename: (newName: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameDialog({ currentName, onRename, open, onOpenChange }: RenameDialogProps) {
  const [shaderName, setShaderName] = useState(currentName || '');
  const { loading, error, setLoading, setError, resetState } = useDialogState();

  // Update shader name when currentName changes or dialog opens
  useEffect(() => {
    if (open && currentName) {
      setShaderName(currentName);
    }
  }, [currentName, open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const handleRename = async () => {
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
      await onRename(shaderName.trim());
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error renaming shader:', err);
      const message = err.message || 'Failed to rename shader. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename Shader"
      description="Choose a new name for your shader"
      error={error}
      onConfirm={handleRename}
      confirmText="Rename"
      loading={loading}
      loadingText="Renaming..."
      confirmDisabled={!shaderName.trim()}
    >
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
            if (e.key === 'Enter' && !loading && shaderName.trim()) {
              handleRename();
            }
          }}
          placeholder="My Awesome Shader"
          disabled={loading}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          autoFocus
        />
        <p className="text-xs text-gray-500">
          This will update the shader name
        </p>
      </div>
    </ActionDialog>
  );
}
