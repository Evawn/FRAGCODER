import { useState, useEffect } from 'react';
import { ActionDialog } from '../ui/ActionDialog';
import { useDialogState } from '../../hooks/useDialogState';

interface SaveAsDialogProps {
  onSave: (shaderName: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveAsDialog({ onSave, open, onOpenChange }: SaveAsDialogProps) {
  const [shaderName, setShaderName] = useState('');
  const { loading, error, setLoading, setError, resetState } = useDialogState();

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setShaderName('');
      resetState();
    }
  }, [open, resetState]);

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
      await onSave(shaderName.trim());
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving shader:', err);
      const message = err.message || 'Failed to save shader. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Save Shader"
      description="Choose a name for your shader"
      error={error}
      onConfirm={handleSave}
      confirmText="Save"
      loading={loading}
      loadingText="Saving..."
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
    </ActionDialog>
  );
}
