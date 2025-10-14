import { Button } from '../ui/button';

interface NewShaderButtonProps {
  onClick: () => void;
}

export function NewShaderButton({ onClick }: NewShaderButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto px-2 py-1 text-large font-light text-foreground bg-transparent hover:text-accent hover:bg-transparent focus:outline-none"
      style={{ outline: 'none', border: 'none' }}
      onClick={onClick}
    >
      <span className="text-lg">New+</span>
    </Button>
  );
}
