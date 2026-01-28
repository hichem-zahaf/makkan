'use client';

import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ title, onMenuClick, showMenuButton = false }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-background">
      <div className="flex items-center gap-4">
        {showMenuButton && onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick}>
            <Menu className="w-5 h-5" />
          </Button>
        )}
        {title && (
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)}>
          <Search className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>
      </div>

      {searchOpen && (
        <div className="absolute top-full left-0 right-0 p-4 bg-background border-b shadow-lg z-50">
          <div className="max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full h-10 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
