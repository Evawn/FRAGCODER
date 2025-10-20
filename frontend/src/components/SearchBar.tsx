// Search input component with icon and Enter key support for triggering search
import { Search } from 'lucide-react';

interface SearchBarProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  placeholder?: string;
}

function SearchBar({ inputValue, onInputChange, onSearchSubmit, placeholder = "Search shaders..." }: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit();
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-4 py-1 pl-10 bg-transparent border text-editor font-light border-foreground-muted focus:border-foreground hover:bg-background-highlighted rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      />
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-muted" />
    </div>
  );
}

export default SearchBar;