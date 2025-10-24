// Button for creating a new shader
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';

interface NewShaderButtonProps {
  onClick: () => void;
}

export function NewShaderButton({ onClick }: NewShaderButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto px-2 py-1 gap-0 text-large font-light text-foreground bg-transparent hover:text-accent hover:bg-transparent focus:outline-none"
      style={{ outline: 'none', border: 'none' }}
      onClick={onClick}
    >
      <span className="text-large hidden md:inline">New</span>
      <Plus className="w-4 h-4 md:ml-1" />
    </Button>
  );
}
