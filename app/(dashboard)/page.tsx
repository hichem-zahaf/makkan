'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  FolderOpen,
  Clock,
  TrendingUp,
  BookOpen,
  Star,
  Upload,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';

interface DocumentStats {
  total: number;
  byReadStatus: {
    unread: number;
    reading: number;
    read: number;
  };
  byCategory: Record<string, number>;
  totalSize: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  href?: string;
  className?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  href,
  className,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        'p-6 rounded-lg border bg-card hover:shadow-md transition-shadow',
        href && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <Icon className="w-8 h-8 text-muted-foreground/50" />
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [librariesCount, setLibrariesCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        // Load stats
        const statsRes = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stats' }),
        });
        const statsData = await statsRes.json();
        setStats(statsData);

        // Load libraries count
        const settingsRes = await fetch('/api/settings');
        const settingsData = await settingsRes.json();
        setLibrariesCount(settingsData.libraries?.length || 0);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading your library...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg border bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Get top categories
  const topCategories = Object.entries(stats?.byCategory || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to your local document management system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={stats?.total || 0}
          icon={FileText}
          description="Across all libraries"
          href="/documents"
        />
        <StatCard
          title="Unread"
          value={stats?.byReadStatus.unread || 0}
          icon={BookOpen}
          description="Waiting to be read"
          href="/documents?readStatus=unread"
        />
        <StatCard
          title="Libraries"
          value={librariesCount}
          icon={FolderOpen}
          description="Configured libraries"
          href="/settings"
        />
        <StatCard
          title="Total Size"
          value={formatFileSize(stats?.totalSize || 0)}
          icon={TrendingUp}
          description="PDF storage used"
        />
      </div>

      {/* Reading Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Read Status Breakdown */}
        <div className="p-6 rounded-lg border bg-card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Reading Progress
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Unread</span>
              <span className="font-medium">{stats?.byReadStatus.unread || 0}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{
                  width: `${((stats?.byReadStatus.unread || 0) / (stats?.total || 1)) * 100}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reading</span>
              <span className="font-medium">{stats?.byReadStatus.reading || 0}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{
                  width: `${((stats?.byReadStatus.reading || 0) / (stats?.total || 1)) * 100}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Read</span>
              <span className="font-medium">{stats?.byReadStatus.read || 0}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${((stats?.byReadStatus.read || 0) / (stats?.total || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="p-6 rounded-lg border bg-card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5" />
            Top Categories
          </h2>
          {topCategories.length > 0 ? (
            <div className="space-y-2">
              {topCategories.map(([category, count]) => (
                <Link
                  key={category}
                  href={`/documents?category=${encodeURIComponent(category)}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-accent transition-colors"
                >
                  <span className="text-sm">{category}</span>
                  <span className="text-sm text-muted-foreground">{count} docs</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No categories yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 rounded-lg border bg-card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/import"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <Upload className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Import Documents</p>
              <p className="text-sm text-muted-foreground">
                Add PDFs from your computer
              </p>
            </div>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <FolderOpen className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Configure Libraries</p>
              <p className="text-sm text-muted-foreground">
                Set up document folders
              </p>
            </div>
          </Link>
          <Link
            href="/search"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Advanced Search</p>
              <p className="text-sm text-muted-foreground">
                Find documents by metadata
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
