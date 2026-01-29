'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FileText,
  FolderOpen,
  Settings,
  Upload,
  BookOpen,
  Tag,
  Search,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/components/theme-toggle';
import Particles from '@/components/bg/Particles';

interface Library {
  id: string;
  name: string;
}

interface QuickStats {
  totalDocuments: number;
  unreadCount: number;
  readingCount: number;
  readCount: number;
}

export default function HomePage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch libraries
        const librariesRes = await fetch('/api/settings');
        if (librariesRes.ok) {
          const data = await librariesRes.json();
          setLibraries(data.libraries || []);
        }

        // Fetch stats if we have libraries
        const statsRes = await fetch('/api/documents/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const hasLibraries = libraries.length > 0;

  const features = [
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Organize your PDFs with rich metadata, categories, and tags.',
    },
    {
      icon: BookOpen,
      title: 'Reading Progress',
      description: 'Track what you\'ve read, what you\'re reading, and what\'s unread.',
    },
    {
      icon: Search,
      title: 'Powerful Search',
      description: 'Find any document instantly with fuzzy search across all metadata.',
    },
    {
      icon: Tag,
      title: 'Custom Tags',
      description: 'Create your own tagging system to organize documents your way.',
    },
  ];

  const quickActions = [
    { href: '/documents', label: 'Browse Documents', icon: FolderOpen, color: 'bg-secondary' },
    { href: '/import', label: 'Import Files', icon: Upload, color: 'bg-secondary' },
    { href: '/search', label: 'Search', icon: Search, color: 'bg-accent' },
    { href: '/settings', label: 'Settings', icon: Settings, color: 'bg-muted' },
  ];

  return (
    <main className="min-h-screen">
      {/* Theme Toggle in top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
        <div className="container mx-auto px-6 py-16 md:py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <img
                src="/images/logo.png"
                alt="MAKKAN Logo"
                className="w-24 h-24 md:w-32 md:h-32"
              />
            </div>
            <h1 className="font-playfair text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              MAKKAN
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Your Local PDF Document Management System
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Organize, search, and manage your PDF collection with markdown-based metadata.
              Completely local, completely private.
            </p>
            {hasLibraries ? (
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/documents">
                    Browse Documents
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/import">Import New Files</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Set Up Your Library
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Particles Background */}
        <div className="absolute inset-0 -z-10">
          <Particles
            particleColors={["#452829", "#E8D1C5"]}
            particleCount={200}
            particleSpread={10}
            speed={0.1}
            particleBaseSize={100}
            moveParticlesOnHover={false}
            alphaParticles={false}
            disableRotation={false}
            pixelRatio={1}
          />
        </div>
      </section>

      {/* Quick Stats - Only show if libraries configured */}
      {hasLibraries && stats && (
        <section className="border-b bg-card/50">
          <div className="container mx-auto px-6 py-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6">Your Library at a Glance</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={FileText}
                  label="Total Documents"
                  value={stats.totalDocuments}
                  color="text-primary"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Read"
                  value={stats.readCount}
                  color="text-green-600"
                />
                <StatCard
                  icon={BookOpen}
                  label="Reading"
                  value={stats.readingCount}
                  color="text-yellow-600"
                />
                <StatCard
                  icon={FileText}
                  label="Unread"
                  value={stats.unreadCount}
                  color="text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Setup Guidance - Only show if no libraries */}
      {!hasLibraries && !loading && (
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-6 py-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                Get Started with MAKKAN
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <StepCard
                  number={1}
                  title="Configure Libraries"
                  description="Add folders containing your PDF documents in Settings."
                  icon={Settings}
                />
                <StepCard
                  number={2}
                  title="Scan Documents"
                  description="MAKKAN will automatically scan and import your PDF files."
                  icon={FolderOpen}
                />
                <StepCard
                  number={3}
                  title="Organize & Read"
                  description="Add metadata, tags, and track your reading progress."
                  icon={BookOpen}
                />
              </div>
              <div className="text-center mt-8">
                <Button size="lg" asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Go to Settings
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Feature Highlights - Show in both modes */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-12 text-center">
              Everything You Need to Manage Your PDFs
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="border-t bg-card/50 py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6 text-center">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <div
                    className={cn(
                      'p-3 rounded-full',
                      action.color
                    )}
                  >
                    <action.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <span className="text-sm font-medium text-center">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-card border rounded-lg p-4 text-center">
      <Icon className={cn('h-8 w-8 mx-auto mb-2', color)} />
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-6 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="flex-shrink-0">
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-4">
        {number}
      </div>
      <Icon className="h-8 w-8 text-primary mb-4" />
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
