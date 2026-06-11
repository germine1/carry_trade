import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      {/* Simple fallback: keeps mistyped pair URLs from becoming dead ends. */}
      <section className="max-w-md rounded-lg border border-line bg-white p-6 text-center shadow-soft">
        <h1 className="text-2xl font-semibold text-ink">Pair Not Found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">This currency is not in the current USD/G10 universe.</p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
