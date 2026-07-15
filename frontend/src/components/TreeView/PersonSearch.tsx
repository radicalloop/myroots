import clsx from "clsx";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TreePersonNode } from "@/types/api.types";
import { formatPersonName, flattenPersons } from "@/utils/tree.utils";

interface PersonSearchProps {
  root: TreePersonNode;
  onSelect: (person: TreePersonNode) => void;
  className?: string;
}

const MAX_RESULTS = 8;

function matchesQuery(person: TreePersonNode, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;

  const fullName = formatPersonName(person).toLowerCase();
  const firstName = person.first_name.toLowerCase();
  const lastName = person.last_name.toLowerCase();

  return (
    fullName.includes(normalizedQuery) ||
    firstName.includes(normalizedQuery) ||
    lastName.includes(normalizedQuery)
  );
}

export function PersonSearch({ root, onSelect, className }: PersonSearchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const allPersons = useMemo(() => flattenPersons(root), [root]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return allPersons
      .filter((person) => matchesQuery(person, query))
      .slice(0, MAX_RESULTS);
  }, [allPersons, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (person: TreePersonNode) => {
    onSelect(person);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (event.key === "Escape") {
        setQuery("");
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleSelect(results[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setQuery("");
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={clsx("relative max-w-full sm:max-w-sm", className)}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search people..."
          aria-label="Search family tree"
          aria-expanded={isOpen && results.length > 0}
          aria-controls="person-search-results"
          className="h-10 w-full rounded-xl border border-border-soft bg-white py-2.5 pl-10 pr-10 text-sm text-text-primary shadow-sm outline-none transition-all duration-200 placeholder:text-text-muted hover:border-warm-300 focus:border-brand-400 focus:ring-[3px] focus:ring-brand-500/15 sm:h-11"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-text-muted transition-colors hover:text-text-secondary"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <div
          id="person-search-results"
          role="listbox"
          className="absolute z-20 mt-2 max-h-72 w-full animate-scale-in overflow-y-auto rounded-[var(--radius-card)] border border-border-soft bg-white py-1.5 shadow-[var(--shadow-card-hover)] custom-scrollbar"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">No people found</p>
          ) : (
            results.map((person, index) => (
              <button
                key={person.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(person)}
                className={clsx(
                  "mx-1.5 flex w-[calc(100%-12px)] items-center rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150",
                  index === activeIndex
                    ? "bg-brand-50 text-brand-800"
                    : "text-text-primary hover:bg-warm-50",
                )}
              >
                {formatPersonName(person)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
