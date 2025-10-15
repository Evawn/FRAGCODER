import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Play } from 'lucide-react';

interface EditorFooterProps {
  compilationSuccess?: boolean;
  compilationTime: number;
  showErrorDecorations: boolean;
  onToggleErrorDecorations: (show: boolean) => void;
  onCompile: () => void;
  charCount: number;
}

export function EditorFooter({
  compilationSuccess,
  compilationTime,
  showErrorDecorations,
  onToggleErrorDecorations,
  onCompile,
  charCount,
}: EditorFooterProps) {
  return (
    <div className="relative bg-transparent flex items-center px-2 py-1 gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onCompile}
        className="w-6 h-6 p-1 bg-transparent focus:outline-none border-transparent text-success hover:bg-success hover:text-foreground-highlighted"
        title="Compile Shader"
      >
        <Play className='!size-5' />
      </Button>
      <Badge
        variant="outline"
        className={`bg-transparent  italic border-transparent font-light font-mono text-xs px-2 py-0 ${compilationSuccess === false
          ? 'text-error'
          : 'text-success'
          }`}
      >
        {compilationSuccess === false
          ? 'Compilation Failed'
          : `Compiled in ${compilationTime} ms`
        }
      </Badge>
      <div className="flex-1" />

      {/* Centered character count badge */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <Badge
          variant="outline"
          className="bg-transparent border-transparent font-mono font-light text-xs px-2 py-0 text-foreground"
        >
          {charCount} chars
        </Badge>
      </div>
    </div>
  );
}
