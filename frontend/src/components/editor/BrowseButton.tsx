// Button for navigating to the shader gallery
import { Button } from '../ui/button';
import { LayoutGrid } from 'lucide-react';

interface BrowseButtonProps {
  onClick: () => void;
}

export function BrowseButton({ onClick }: BrowseButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto px-2 py-1 gap-0 text-large font-light text-foreground bg-transparent hover:text-accent hover:bg-transparent focus:outline-none"
      style={{ outline: 'none', border: 'none' }}
      onClick={onClick}
    >
      <span className="text-large">Browse</span>
      {/* <LayoutGrid className="!w-5 !h-5 ml-1 stroke-[1.5]" /> */}
    </Button>
  );
}
