"use client";

export default function Error() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-zinc-400">An unexpected error occurred. Please try again later.</p>
        <a href="/" className="mt-4 inline-block text-blue-400 hover:underline">
          Go home
        </a>
      </div>
    </div>
  );
}
