import { useState, useCallback } from 'react';

type DialogType = 'signin' | 'saveAs' | 'rename' | 'delete' | 'clone' | null;

/**
 * Hook to manage which dialog is currently open.
 * Provides imperative-style controls for dialog state.
 */
export function useDialogManager() {
  const [openDialog, setOpenDialog] = useState<DialogType>(null);
  const [signInCallback, setSignInCallback] = useState<(() => void) | undefined>();

  const openSignIn = useCallback((callback?: () => void) => {
    setSignInCallback(() => callback);
    setOpenDialog('signin');
  }, []);

  const openSaveAs = useCallback(() => {
    setOpenDialog('saveAs');
  }, []);

  const openRename = useCallback(() => {
    setOpenDialog('rename');
  }, []);

  const openDelete = useCallback(() => {
    setOpenDialog('delete');
  }, []);

  const openClone = useCallback(() => {
    setOpenDialog('clone');
  }, []);

  const closeDialog = useCallback(() => {
    setOpenDialog(null);
    setSignInCallback(undefined);
  }, []);

  return {
    // State
    openDialog,
    signInCallback,

    // Actions
    openSignIn,
    openSaveAs,
    openRename,
    openDelete,
    openClone,
    closeDialog,

    // Helper to check if a specific dialog is open
    isOpen: (dialog: DialogType) => openDialog === dialog,
  };
}
