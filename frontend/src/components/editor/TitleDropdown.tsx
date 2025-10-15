import { useMemo } from 'react';
import { Button } from '../ui/button';
import { Dropdown } from '../ui/Dropdown';
import type { DropdownOption } from '../ui/Dropdown';
import { ChevronDown } from 'lucide-react';

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
        className="h-auto justify-start min-w-[128px] px-0 py-1 text-title tracking-tighter text-foreground bg-transparent hover:text-accent hover:bg-transparent focus:outline-none"
        style={{ outline: 'none', border: 'none' }}
      >
        <span className="text-lg italic">{title}</span>
        <ChevronDown className="w-3 h-3 ml-1" />
      </Button>
    </Dropdown>
  );
}
