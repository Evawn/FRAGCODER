import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '../../utils/cn';

export interface DropdownOption {
  text: string;
  callback: () => void;
}

interface DropdownProps {
  children: React.ReactNode;
  options: DropdownOption[];
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  collisionPadding?: number;
}

export function Dropdown({ children, options, align = 'center', sideOffset = 8, collisionPadding = 4 }: DropdownProps) {
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
        collisionPadding={collisionPadding}
        className={cn(
          "w-auto p-0 bg-background border-accent",
          "rounded-none shadow-lg",
          "min-w-[40px]"
        )}
      >
        {/* Triangle arrow at top */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-accent" />
        <div className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-accent" />

        {/* Menu options */}
        <div className="p-0.5 gap-0.5 flex flex-col">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option.callback)}
              className="min-w-[128px] rounded px-4 py-2 text-left text-sm text-foreground hover:text-foreground-highlighted hover:bg-background-highlighted transition-colors duration-150"
            >
              {option.text}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
