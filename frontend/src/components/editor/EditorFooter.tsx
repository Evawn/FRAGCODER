import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

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
    <div className="relative bg-editor-footer border-t border-border flex items-center px-2 gap-2" style={{ height: '30px' }}>
      <Button
        variant="outline"
        size="icon"
        onClick={onCompile}
        className="h-6 w-6 bg-transparent focus:outline-none border-success text-success hover:bg-success/10 hover:text-success"
        title="Compile Shader"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
        </svg>
      </Button>
      <Badge
        variant="outline"
        className={`bg-transparent border-transparent font-mono text-xs px-2 py-0 ${compilationSuccess === false
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
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onToggleErrorDecorations(!showErrorDecorations)}
        className="h-6 w-6 bg-transparent hover:outline-none hover:bg-transparent focus:outline-none"
        style={{ outline: 'none', border: 'none' }}
        title={showErrorDecorations ? 'Hide error decorations' : 'Show error decorations'}
      >
        {showErrorDecorations ? (
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        )}
      </Button>

      {/* Centered character count badge */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <Badge
          variant="outline"
          className="bg-transparent border-transparent font-mono text-xs px-2 py-0 text-muted-foreground"
        >
          {charCount} chars
        </Badge>
      </div>
    </div>
  );
}
