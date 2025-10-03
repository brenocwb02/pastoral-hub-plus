import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SearchAndFiltersProps {
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  filters?: {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
  }[];
  onClearFilters?: () => void;
  resultCount?: number;
}

export function SearchAndFilters({
  searchPlaceholder = "Buscar...",
  onSearchChange,
  filters = [],
  onClearFilters,
  resultCount,
}: SearchAndFiltersProps) {
  const [searchValue, setSearchValue] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange]);

  const hasActiveFilters = filters.some(f => f.value !== "");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>
        {filters.length > 0 && (
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                {filters.filter(f => f.value !== "").length}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {showFilters && filters.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.id}>
                <label className="text-sm font-medium mb-2 block">{filter.label}</label>
                <Select value={filter.value} onValueChange={filter.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Todos ${filter.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {hasActiveFilters && onClearFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {resultCount !== undefined && (
        <div className="text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? "resultado" : "resultados"} encontrado{resultCount === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
