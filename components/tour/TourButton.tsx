"use client";

/** A "?" affordance that replays the page's Tour. */
export default function TourButton({ tourKey }: { tourKey: string }) {
  return (
    <button
      type="button"
      title="Take the tour"
      aria-label="Take the tour"
      onClick={() => window.dispatchEvent(new CustomEvent("vp:start-tour", { detail: tourKey }))}
      className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
    >
      ?
    </button>
  );
}
