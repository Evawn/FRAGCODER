import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '../../utils/cn';
import type { LucideIcon } from 'lucide-react';

export interface DropdownOption {
  text: string;
  callback: () => void;
  icon?: LucideIcon;
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
          "w-auto p-0 bg-background border-2 sm:rounded-md border-accent",
          "rounded-none shadow-lg",
          "min-w-[40px]",
          "relative"
        )}
      >
        {/* Triangle pointer at top center */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-[9px] w-0 h-0">
          {/* Outer triangle (border) */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderBottom: '9px solid hsl(38 92% 50%)',
            }}
          />
          {/* Inner triangle (background) */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-[3px]"
            style={{
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderBottom: '7px solid hsl(38 5% 11%)',
            }}
          />
        </div>

        {/* Menu options */}
        <div className="p-0.5 gap-0.5 flex flex-col">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={index}
                onClick={() => handleOptionClick(option.callback)}
                className="min-w-[128px] rounded px-2 py-2 text-left text-sm text-foreground hover:text-foreground-highlighted hover:bg-background-highlighted transition-colors duration-150 flex items-center gap-2"
              >
                {Icon && <Icon className="w-4 h-4 stroke-[2]" />}
                {option.text}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
