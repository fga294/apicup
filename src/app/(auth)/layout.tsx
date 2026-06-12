export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-5xl">🥇</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
            The API Cup
          </h1>
          <p className="mt-1 text-sm text-purple-300">
            Artificial Prediction Intelligence
          </p>
          <p className="mt-2 text-xs italic text-purple-400">
            Can humans outperform the machines?
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
