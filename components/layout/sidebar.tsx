'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  Settings,
  FolderOpen,
  Upload,
  ChevronLeft,
  ChevronRight,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  className?: string;
  onCollapse?: () => void;
  collapsed?: boolean;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface Library {
  id: string;
  name: string;
  path?: string;
}

interface SidebarPropsExtended extends SidebarProps {
  libraries?: Library[];
}

export function Sidebar({ libraries = [], className, onCollapse, collapsed = false }: SidebarPropsExtended) {
  const pathname = usePathname();
  const [librarySizes, setLibrarySizes] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchLibrarySizes() {
      const sizes: Record<string, string> = {};
      for (const lib of libraries) {
        try {
          const res = await fetch(`/api/settings/libraries/${lib.id}`);
          if (res.ok) {
            const data = await res.json();
            sizes[lib.id] = formatFileSize(data.size || 0);
          }
        } catch (error) {
          console.error(`Failed to fetch size for library ${lib.id}:`, error);
        }
      }
      setLibrarySizes(sizes);
    }
    fetchLibrarySizes();
  }, [libraries]);

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  return (
    <div className={cn('flex flex-col h-full bg-muted/30 border-r', collapsed && 'w-16', className)}>
      {/* Logo/Brand */}
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <Image
                src="/images/logo.png"
                alt="MAKKAN Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold">MAKKAN</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onCollapse}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase">
            Menu
          </div>
        )}
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* Libraries */}
        {libraries.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-2 mt-6 mb-2 text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                Libraries
                <HardDrive className="w-3 h-3" />
              </div>
            )}
            {libraries.map((library) => (
              <Link
                key={library.id}
                href={`/documents?library=${library.id}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname?.includes(`library=${library.id}`)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                title={collapsed ? library.name : undefined}
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{library.name}</div>
                    {librarySizes[library.id] && (
                      <div className="text-xs text-muted-foreground truncate">
                        {librarySizes[library.id]}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t text-xs text-muted-foreground">
        {!collapsed ? (
          <div className="text-center">Local DMS v0.1.0</div>
        ) : (
          <div className="text-center">v0.1.0</div>
        )}
      </div>
    </div>
  );
}
