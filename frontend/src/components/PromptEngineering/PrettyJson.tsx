/**
 * PrettyJson
 * Recursive JSON renderer that displays string values with actual newlines
 * instead of \n literals. Monochrome styling, no syntax highlighting.
 */

import { cn } from '@/lib/utils';

interface PrettyJsonProps {
  data: unknown;
  className?: string;
}

/**
 * Render a JSON value recursively with proper formatting
 */
function renderValue(value: unknown, indent: number = 0): React.ReactNode {
  const indentStr = '  '.repeat(indent);
  const nextIndent = indent + 1;
  const nextIndentStr = '  '.repeat(nextIndent);

  // Null
  if (value === null) {
    return <span className="text-muted-foreground">null</span>;
  }

  // Undefined (shouldn't appear in JSON, but handle gracefully)
  if (value === undefined) {
    return <span className="text-muted-foreground">undefined</span>;
  }

  // Boolean
  if (typeof value === 'boolean') {
    return <span>{value ? 'true' : 'false'}</span>;
  }

  // Number
  if (typeof value === 'number') {
    return <span>{value}</span>;
  }

  // String - the key feature: render newlines as actual line breaks
  if (typeof value === 'string') {
    // Check if string contains newlines
    if (value.includes('\n')) {
      const lines = value.split('\n');
      return (
        <span>
          "
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
          "
        </span>
      );
    }
    // Simple string without newlines
    return <span>"{value}"</span>;
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span>[]</span>;
    }
    return (
      <span>
        {'[\n'}
        {value.map((item, i) => (
          <span key={i}>
            {nextIndentStr}
            {renderValue(item, nextIndent)}
            {i < value.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        ))}
        {indentStr}]
      </span>
    );
  }

  // Object
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span>{'{}'}</span>;
    }
    return (
      <span>
        {'{\n'}
        {entries.map(([key, val], i) => (
          <span key={key}>
            {nextIndentStr}
            <span className="text-foreground">"{key}"</span>
            {': '}
            {renderValue(val, nextIndent)}
            {i < entries.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        ))}
        {indentStr}{'}'}
      </span>
    );
  }

  // Fallback for any other type
  return <span>{String(value)}</span>;
}

export function PrettyJson({ data, className }: PrettyJsonProps) {
  return (
    <pre className={cn('text-xs font-mono whitespace-pre-wrap break-words', className)}>
      {renderValue(data, 0)}
    </pre>
  );
}
