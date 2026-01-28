'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  Search,
  Settings,
  FolderOpen,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface Library {
  id: string;
  name: string;
}

interface SidebarPropsExtended extends SidebarProps {
  libraries?: Library[];
}

export function Sidebar({ libraries = [], className }: SidebarPropsExtended) {
  const pathname = usePathname();

  return (
    <div className={cn('flex flex-col h-full bg-muted/30 border-r', className)}>
      {/* Logo/Brand */}
      <div className="p-6 border-b">
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
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase">
          Menu
        </div>
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
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}

        {/* Libraries */}
        {libraries.length > 0 && (
          <>
            <div className="px-3 mt-6 mb-2 text-xs font-semibold text-muted-foreground uppercase">
              Libraries
            </div>
            {libraries.map((library) => (
              <Link
                key={library.id}
                href={`/documents?library=${library.id}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname?.startsWith(`/documents?library=${library.id}`)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <FolderOpen className="w-4 h-4" />
                {library.name}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Local DMS v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
