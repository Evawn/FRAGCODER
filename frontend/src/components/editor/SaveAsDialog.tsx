import { useState, useEffect } from 'react';
import { ActionDialog } from '../ui/ActionDialog';
import { Input } from '../ui/input';
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
        <Input
          id="shaderName"
          value={shaderName}
          onChange={(e) => setShaderName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading && shaderName.trim()) {
              handleSave();
            }
          }}
          placeholder="My Awesome Shader"
          disabled={loading}
          autoFocus
        />
        <p className="text-xs italic font-light tracking-tighter text-foreground-muted">
          This will be displayed in the shader gallery
        </p>
      </div>
    </ActionDialog>
  );
}
