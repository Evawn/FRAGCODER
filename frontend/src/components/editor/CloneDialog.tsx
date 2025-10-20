// Dialog for cloning an existing shader to the user's account
import { useEffect } from 'react';
import { ActionDialog } from '../ui/ActionDialog';
import { useDialogState } from '../../hooks/useDialogState';
import { GitBranchPlus } from 'lucide-react';

interface CloneDialogProps {
  shaderName?: string;
  onClone: () => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloneDialog({ shaderName, onClone, open, onOpenChange }: CloneDialogProps) {
  const { loading, error, setLoading, setError, resetState } = useDialogState();

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const handleClone = async () => {
    setLoading(true);
    setError(null);

    try {
      await onClone();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error cloning shader:', err);
      const message = err.message || 'Failed to clone shader. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Clone ${'"' + shaderName + '"'}?`}
      description={`This shader will be cloned to your account and you'll be redirected to it`}
      icon={<GitBranchPlus size={18} strokeWidth={2} />}
      error={error}
      onConfirm={handleClone}
      confirmText="Clone"
      loading={loading}
      loadingText="Cloning..."
    // message={{
    //   type: 'info',
    //   content: (
    //     <>
    //       <p className="text-small text-accent">
    //         Clone{' '}
    //         <span className="font-semibold">{shaderName || 'this shader'}</span>?
    //       </p>
    //       <p className="text-xs text-foreground-highlighted mt-2">
    //         A new shader named <span className="font-semibold">"{shaderName || 'Shader'} (Clone)"</span> will be created and you'll be redirected to it.
    //       </p>
    //     </>
    //   ),
    // }}
    />
  );
}
