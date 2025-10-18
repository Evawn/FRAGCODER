import { Search } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}

function SearchBar({ searchTerm, onSearchChange, placeholder = "Search shaders..." }: SearchBarProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-1 pl-10 bg-transparent border text-editor font-light border-foreground-muted focus:border-foreground hover:bg-background-highlighted rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      />
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-muted" />
    </div>
  );
}

export default SearchBar;