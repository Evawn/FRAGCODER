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
      title={`Delete Tab ${tabName ? `"${tabName}"` : ''}?`}
      description="This action cannot be undone"
      onConfirm={handleDelete}
      confirmText="Delete"
      confirmClassName="bg-red-600 hover:bg-red-700 text-white"
    />
  );
}
