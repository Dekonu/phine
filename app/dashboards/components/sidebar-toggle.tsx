"use client";

interface SidebarToggleProps {
  open: boolean;
  onToggle: () => void;
}

export function SidebarToggle({ open, onToggle }: SidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`fixed z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-lg transition-all duration-300 ease-in-out hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 ${
        open ? "left-[17rem] top-4" : "left-4 top-4"
      }`}
      aria-label={open ? "Hide sidebar" : "Show sidebar"}
    >
      {open ? (
        <svg
          className="h-5 w-5 text-zinc-600 dark:text-zinc-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg
          className="h-5 w-5 text-zinc-600 dark:text-zinc-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      )}
    </button>
  );
}

