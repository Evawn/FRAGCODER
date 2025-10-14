import { useMemo } from 'react';
import { Button } from '../ui/button';
import { Dropdown } from '../ui/Dropdown';
import type { DropdownOption } from '../ui/Dropdown';

interface TitleDropdownProps {
  title: string;
  isSavedShader: boolean;
  isOwner: boolean;
  onSave: () => void;
  onSaveAs: () => void;
  onRename: () => void;
  onClone: () => void;
  onDelete: () => void;
}

export function TitleDropdown({
  title,
  isSavedShader,
  isOwner,
  onSave,
  onSaveAs,
  onRename,
  onClone,
  onDelete,
}: TitleDropdownProps) {
  // Dynamic dropdown options based on shader state and ownership
  const dropdownOptions: DropdownOption[] = useMemo(() => {
    // New shader - show "Save as..."
    if (!isSavedShader) {
      return [
        {
          text: 'Save as...',
          callback: onSaveAs
        }
      ];
    }

    // Saved shader owned by user - show all options
    if (isOwner) {
      return [
        {
          text: 'Save',
          callback: onSave
        },
        {
          text: 'Rename',
          callback: onRename
        },
        {
          text: 'Clone',
          callback: onClone
        },
        {
          text: 'Delete',
          callback: onDelete
        }
      ];
    }

    // Saved shader NOT owned by user - show clone only
    return [
      {
        text: 'Clone',
        callback: onClone
      }
    ];
  }, [isSavedShader, isOwner, onSave, onSaveAs, onRename, onClone, onDelete]);

  return (
    <Dropdown options={dropdownOptions}>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto px-2 py-1 text-title tracking-tighter text-foreground bg-transparent hover:text-accent hover:bg-transparent focus:outline-none"
        style={{ outline: 'none', border: 'none' }}
      >
        <span className="text-lg italic">{title}</span>
        <svg
          className="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </Button>
    </Dropdown>
  );
}
