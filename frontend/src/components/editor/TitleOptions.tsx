import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';

interface TitleOptionsProps {
  children: React.ReactNode;
  onRename?: () => void;
  onSave?: () => void;
}

export function TitleOptions({ children, onRename, onSave }: TitleOptionsProps) {
  const [open, setOpen] = useState(false);

  const handleRename = () => {
    setOpen(false);
    onRename?.();
  };

  const handleSave = () => {
    setOpen(false);
    onSave?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn(
          "w-auto p-0 bg-gray-700 border-gray-600",
          "rounded-md shadow-lg",
          // Remove default width and padding
          "min-w-[160px]"
        )}
      >
        {/* Triangle arrow at top */}
        <div className="absolute -top-2 left-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-gray-600" />
        <div className="absolute -top-[7px] left-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-gray-700" />

        {/* Menu options */}
        <div className="py-1">
          <button
            onClick={handleRename}
            className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors duration-150"
          >
            Rename...
          </button>
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors duration-150"
          >
            Save...
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
