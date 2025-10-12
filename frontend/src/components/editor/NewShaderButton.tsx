import { Button } from '../ui/button';

interface NewShaderButtonProps {
  onClick: () => void;
}

export function NewShaderButton({ onClick }: NewShaderButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto px-2 py-1 text-gray-400 bg-transparent hover:text-gray-200 hover:bg-transparent focus:outline-none"
      style={{ outline: 'none', border: 'none' }}
      onClick={onClick}
    >
      <span className="text-lg">New+</span>
    </Button>
  );
}
