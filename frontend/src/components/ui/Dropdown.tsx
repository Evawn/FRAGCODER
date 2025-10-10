import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '../../lib/utils';

export interface DropdownOption {
  text: string;
  callback: () => void;
}

interface DropdownProps {
  children: React.ReactNode;
  options: DropdownOption[];
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

export function Dropdown({ children, options, align = 'start', sideOffset = 8 }: DropdownProps) {
  const [open, setOpen] = useState(false);

  const handleOptionClick = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "w-auto p-0 bg-gray-700 border-gray-600",
          "rounded-md shadow-lg",
          "min-w-[160px]"
        )}
      >
        {/* Triangle arrow at top */}
        <div className="absolute -top-2 left-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-gray-600" />
        <div className="absolute -top-[7px] left-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-gray-700" />

        {/* Menu options */}
        <div className="py-1">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option.callback)}
              className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors duration-150"
            >
              {option.text}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
