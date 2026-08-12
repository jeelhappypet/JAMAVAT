export function LoadingState({ label = "લોડ થઈ રહ્યું છે…" }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-text-muted">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-brand" />
      <p className="text-base">{label}</p>
    </div>
  );
}
