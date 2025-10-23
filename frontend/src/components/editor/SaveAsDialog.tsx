// Dialog for saving a new shader with name validation
import { useState, useEffect } from 'react';
import { ActionDialog } from '../ui/ActionDialog';
import { Input } from '../ui/input';
import { useDialogState } from '../../hooks/useDialogState';
import { Save } from 'lucide-react';
import { logger } from '../../utils/logger';

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
    } catch (err: unknown) {
      logger.error('Failed to save shader', err);
      const message = err instanceof Error ? err.message : 'Failed to save shader. Please try again.';
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
      icon={<Save size={18} strokeWidth={2} />}
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
