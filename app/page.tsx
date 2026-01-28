export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">MAKKAN</h1>
        <p className="text-muted-foreground mb-8">
          Local PDF Document Management System
        </p>
        <div className="border rounded-lg p-6 bg-card">
          <p className="mb-2">Welcome to your local DMS.</p>
          <p className="text-sm text-muted-foreground">
            Configure your document library in Settings to get started.
          </p>
        </div>
      </div>
    </main>
  );
}
