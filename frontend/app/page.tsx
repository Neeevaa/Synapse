export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Synapse Logo" className="size-20 object-contain drop-shadow-sm" />
      <h1 className="text-4xl font-extrabold tracking-tight">
        Synapse is Running 🚀
      </h1>
    </main>
  );
}