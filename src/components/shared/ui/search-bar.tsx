'use client';

import { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative group">
      <div className="relative flex items-center">
        <div className="absolute left-4 flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Search by location or topic</span>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles, neighborhoods, and more..."
          className="w-full h-12 pl-24 pr-12 rounded-full border border-muted 
                   bg-background/60 backdrop-blur-sm shadow-lg
                   focus:border-primary/30 focus:ring-2 focus:ring-primary/20 
                   transition-all duration-300 outline-none
                   placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          className="absolute right-2 p-2 rounded-full bg-primary/10 text-primary 
                   hover:bg-primary/20 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>
      
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-primary/10 via-secondary/10 to-primary/10 
                    rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </form>
  );
} 