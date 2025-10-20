/**
 * Shader title dropdown with context-sensitive actions
 * Shows different options based on shader state (new/saved) and ownership
 */
import { useMemo } from 'react';
import { Button } from '../ui/button';
import { Dropdown } from '../ui/Dropdown';
import type { DropdownOption } from '../ui/Dropdown';
import { ChevronDown, Save, GitBranchPlus, Trash2, PencilLine } from 'lucide-react';

interface TitleDropdownProps {
  title: string;
  creatorUsername?: string;
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
  creatorUsername,
  isSavedShader,
  isOwner,
  onSave,
  onSaveAs,
  onRename,
  onClone,
  onDelete,
}: TitleDropdownProps) {
  // Compute display title with creator name if available
  const displayTitle = creatorUsername ? `${title} - by ${creatorUsername}` : title;
  // Dynamic dropdown options based on shader state and ownership
  const dropdownOptions: DropdownOption[] = useMemo(() => {
    // New shader - show "Save as..."
    if (!isSavedShader) {
      return [
        {
          text: 'Save as...',
          callback: onSaveAs,
          icon: Save
        }
      ];
    }

    // Saved shader owned by user - show all options
    if (isOwner) {
      return [
        {
          text: 'Save',
          callback: onSave,
          icon: Save
        },
        {
          text: 'Rename',
          callback: onRename,
          icon: PencilLine
        },
        {
          text: 'Clone',
          callback: onClone,
          icon: GitBranchPlus
        },
        {
          text: 'Delete',
          callback: onDelete,
          icon: Trash2
        }
      ];
    }

    // Saved shader NOT owned by user - show clone only
    return [
      {
        text: 'Clone',
        callback: onClone,
        icon: GitBranchPlus
      }
    ];
  }, [isSavedShader, isOwner, onSave, onSaveAs, onRename, onClone, onDelete]);

  return (
    <Dropdown options={dropdownOptions}>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto justify-start min-w-[128px] max-w-[600px] px-0 py-1 text-title tracking-tighter text-foreground bg-transparent hover:text-accent hover:bg-transparent focus:outline-none"
        style={{ outline: 'none', border: 'none' }}
      >
        <span className="text-lg font-normal truncate italic">{displayTitle}</span>
        <ChevronDown className="w-3 h-3 ml-1" />
      </Button>
    </Dropdown>
  );
}
