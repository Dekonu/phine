import Link from "next/link";
import { LoginButton } from "./components/login-button";

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:bg-gradient-to-br dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <main className="flex h-full w-full max-w-5xl flex-col items-center justify-center px-8 relative">
        {/* Small Logo/Branding - Top Left */}
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 shadow-md">
            <span className="text-lg font-bold text-white">P</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-300">Phine</span>
        </div>

        {/* Login Button - Top Right */}
        <div className="absolute top-8 right-8">
          <LoginButton />
        </div>

        {/* Main Content - Centered */}
        <div className="flex flex-col items-center gap-12 text-center max-w-3xl">
          {/* Hero Section */}
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-6xl sm:text-7xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
              API Key Management
              <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mt-2">
                Made Simple
              </span>
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
              Secure, monitor, and manage your API keys with ease
            </p>
          </div>

          {/* Feature Icons - Horizontal */}
          <div className="flex items-center gap-8 justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Secure</span>
            </div>
            <div className="h-px w-8 bg-gradient-to-r from-transparent via-zinc-300 to-transparent dark:via-zinc-700"></div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Analytics</span>
            </div>
            <div className="h-px w-8 bg-gradient-to-r from-transparent via-zinc-300 to-transparent dark:via-zinc-700"></div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Protected</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <Link
              className="flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-8 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-xl"
              href="/dashboards"
            >
              Get Started
            </Link>
            <a
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-700 transition-all hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              href="https://github.com/Dekonu/cursor-full-stack-example"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.532 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Docs
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
