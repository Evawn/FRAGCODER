import { useEffect } from 'react';
import { ActionDialog } from '../ui/ActionDialog';
import { useDialogState } from '../../hooks/useDialogState';

interface DeleteShaderDialogProps {
  shaderName?: string;
  onDelete: () => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteShaderDialog({ shaderName, onDelete, open, onOpenChange }: DeleteShaderDialogProps) {
  const { loading, error, setLoading, setError, resetState } = useDialogState();

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await onDelete();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error deleting shader:', err);
      const message = err.message || 'Failed to delete shader. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Shader?"
      description="This action cannot be undone"
      error={error}
      onConfirm={handleDelete}
      confirmText="Delete"
      confirmClassName="bg-red-600 hover:bg-red-700 text-white"
      loading={loading}
      loadingText="Deleting..."
      message={{
        type: 'warning',
        content: (
          <>
            <p className="text-sm text-yellow-300">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{shaderName || 'this shader'}</span>?
            </p>
            <p className="text-xs text-yellow-400 mt-2">
              This will permanently delete the shader and cannot be undone.
            </p>
          </>
        ),
      }}
    />
  );
}
