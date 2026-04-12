export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold">404 — Not Found</h1>
        <p className="mt-2 text-zinc-400">The page you&apos;re looking for doesn&apos;t exist.</p>
        <a href="/" className="mt-4 inline-block text-blue-400 hover:underline">
          Go home
        </a>
      </div>
    </div>
  );
}
