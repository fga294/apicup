export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center text-chalk px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-5xl">🥇</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-chalk">
            The API Cup
          </h1>
          <p className="mt-1 text-sm text-chalk-dim">
            Artificial Prediction Intelligence
          </p>
          <p className="mt-2 text-xs italic text-chalk-dim/70">
            Can humans outperform the machines?
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
