import { ActionDialog } from '../ui/ActionDialog';
import { Trash2 } from 'lucide-react';

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
      icon={<Trash2 size={18} strokeWidth={2} />}
      onConfirm={handleDelete}
      confirmText="Delete"
      confirmClassName="bg-red-600 hover:bg-red-700 text-white"
    />
  );
}
