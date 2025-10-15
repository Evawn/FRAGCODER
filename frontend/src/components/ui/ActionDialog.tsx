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
  description?: string;

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
        return 'bg-warning/10 border-warning/50 text-foreground-highlighted';
      case 'error':
        return 'bg-error/10 border-error/50 text-foreground-highlighted';
      case 'info':
      default:
        return 'bg-accent/10 border-accent/50 text-foreground-highlighted rounded-none';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80 bg-background border-accent border-2 sm:rounded-none text-foreground p-4">
        <DialogHeader>
          <DialogTitle className="text-large font-semibold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="tracking-tighter text-small font-light italic text-foreground-muted">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-error/10 border border-error rounded-none p-3">
              <p className="text-sm text-foreground-highlighted">{error}</p>
            </div>
          )}

          {/* Optional Message Box */}
          {message && (
            <div className={`border rounded-none p-3 ${getMessageStyles(message.type)}`}>
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
              className="flex-1 bg-background text-large font-light border-background-highlighted text-foreground hover:bg-background-highlighted hover:text-foreground-highlighted"
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              className={`flex-1 ${confirmClassName} text-large font-light bg-accent-shadow border-accent hover:bg-accent text-foreground-highlighted`}
              disabled={loading || confirmDisabled}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-accent bg-accent-shadow text-foreground hover:bg-accent hover:text-foreground-highlighted border-t-transparent rounded-full animate-spin" />
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
