'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [libraries, setLibraries] = useState<Array<{ id: string; name: string }>>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load libraries
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setLibraries(data.libraries || []);
      })
      .catch(console.error);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 flex-shrink-0 hidden md:block">
          <Sidebar libraries={libraries} />
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          showMenuButton
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {!sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(true)}
        />
      )}
    </div>
  );
}
