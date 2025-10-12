import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';

type MessageType = 'info' | 'warning' | 'error';

interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;

  // Content
  children?: ReactNode;
  message?: {
    type: MessageType;
    content: ReactNode;
  };

  // Error state
  error?: string | null;

  // Actions
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;

  // Button config
  confirmText?: string;
  cancelText?: string;
  confirmClassName?: string;
  loading?: boolean;
  loadingText?: string;
  confirmDisabled?: boolean;
}

export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  message,
  error,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmClassName = 'bg-blue-600 hover:bg-blue-700 text-white',
  loading = false,
  loadingText = 'Processing...',
  confirmDisabled = false,
}: ActionDialogProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  const getMessageStyles = (type: MessageType) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300';
      case 'error':
        return 'bg-red-500/10 border-red-500/50 text-red-400';
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/50 text-blue-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80 bg-gray-800 border-gray-700 text-white p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Optional Message Box */}
          {message && (
            <div className={`border rounded-md p-3 ${getMessageStyles(message.type)}`}>
              <div className="text-sm">{message.content}</div>
            </div>
          )}

          {/* Custom Content */}
          {children}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              className={`flex-1 ${confirmClassName}`}
              disabled={loading || confirmDisabled}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{loadingText}</span>
                </div>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
