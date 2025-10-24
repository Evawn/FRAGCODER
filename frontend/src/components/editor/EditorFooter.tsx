// Editor footer bar with compile button, compilation status badge, and character count
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Play } from 'lucide-react';

interface EditorFooterProps {
  compilationSuccess?: boolean;
  compilationTime: number;
  isCompiling: boolean;
  lastCompilationTime: number;
  showErrorDecorations: boolean;
  onToggleErrorDecorations: (show: boolean) => void;
  onCompile: () => void;
  charCount: number;
}

export function EditorFooter({
  compilationSuccess,
  compilationTime,
  isCompiling,
  lastCompilationTime,
  onCompile,
  charCount,
}: EditorFooterProps) {
  // Determine button animation style based on compilation result
  // Using lastCompilationTime as key to force animation restart
  const getButtonAnimation = () => {
    if (isCompiling) return undefined;
    if (compilationSuccess === true) {
      return 'compileSuccess 300ms ease-out';
    }
    if (compilationSuccess === false) {
      return 'compileFail 300ms ease-out';
    }
    return undefined;
  };

  // Determine button animation class
  let iconClassName = '!size-5';
  if (isCompiling) {
    iconClassName += ' animate-spin';
  }

  return (
    <div className="relative bg-transparent flex items-center px-2 py-1 gap-2">
      <Button
        key={`compile-btn-${lastCompilationTime}`}
        variant="outline"
        size="icon"
        onClick={onCompile}
        disabled={isCompiling}
        className="w-6 h-6 p-1 bg-transparent focus:outline-none border-transparent text-success hover:bg-success hover:text-foreground-highlighted disabled:opacity-50"
        title="Compile Shader"
        style={{
          animation: getButtonAnimation()
        }}
      >
        <Play
          className={iconClassName}
          style={{
            animation: isCompiling ? 'compileButtonSpin 1s linear infinite' : undefined
          }}
        />
      </Button>
      <Badge
        variant="outline"
        className={`bg-transparent select-none italic border-transparent font-light font-mono text-xs px-2 py-0 ${compilationSuccess === false
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

      {/* Character count badge - centered on md+, right-aligned on mobile */}
      <div className="md:absolute md:left-1/2 md:top-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 pointer-events-none">
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
