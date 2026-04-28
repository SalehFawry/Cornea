export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-energy-text-secondary gap-3">
      <div className="w-8 h-8 border-3 border-energy-accent-mint border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
