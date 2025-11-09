interface ToastProps {
  show: boolean;
  message?: string;
  type?: "success" | "error";
}

export function Toast({ show, message = "Copied to clipboard!", type = "success" }: ToastProps) {
  if (!show) return null;

  const isSuccess = type === "success";

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-3 shadow-lg dark:bg-zinc-700">
        {isSuccess ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        <span className="text-sm font-medium text-white">{message}</span>
      </div>
    </div>
  );
}

