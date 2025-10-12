import { ActionDialog } from '../ui/ActionDialog';

interface DeleteTabDialogProps {
  tabName?: string;
  onDelete: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTabDialog({ tabName, onDelete, open, onOpenChange }: DeleteTabDialogProps) {
  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
  };

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Tab"
      description="This action cannot be undone"
      onConfirm={handleDelete}
      confirmText="Delete"
      confirmClassName="bg-red-600 hover:bg-red-700 text-white"
      message={{
        type: 'warning',
        content: (
          <>
            <p className="text-sm text-yellow-300">
              Are you sure you want to delete the{' '}
              <span className="font-semibold">"{tabName}"</span> tab?
            </p>
            <p className="text-xs text-yellow-400 mt-2">
              This will permanently delete the tab and cannot be undone.
            </p>
          </>
        ),
      }}
    />
  );
}
