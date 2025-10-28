export default function HomePage() {
  return (
    <main className="container py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Commercial Real Estate News & Projects
            </h1>
            <p className="text-muted-foreground mt-2">
              Discover the latest developments, connect with industry professionals
            </p>
          </div>
        </div>

        {/* Placeholder for article grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="border rounded-lg p-6 space-y-3 hover:border-primary transition-colors"
            >
              <div className="aspect-video bg-muted rounded-md" />
              <h3 className="font-semibold">Article Title {i}</h3>
              <p className="text-sm text-muted-foreground">
                Article description placeholder...
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
