import { GitHubIcon } from '@/components/ui/icons'

interface AuthPanelProps {
  isLoading: boolean
  error: string | null
  onSignIn: () => Promise<void>
}

export function AuthPanel({ isLoading, error, onSignIn }: AuthPanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">GitHub sign-in</p>
      <div className="max-w-sm space-y-3">
        <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">Sign in to chat.</h2>
        <p className="text-sm leading-relaxed text-muted">
          Use your GitHub account to message the owner or talk to the portfolio assistant. The
          assistant is limited to accounts at least one year old.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          void onSignIn()
        }}
        disabled={isLoading}
        className="inline-flex items-center gap-2 border border-accent bg-accent px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-ink transition-colors hover:bg-ink disabled:cursor-wait disabled:opacity-60"
      >
        <GitHubIcon className="size-4" />
        Continue with GitHub
      </button>
      {error ? (
        <p role="alert" className="max-w-sm text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </section>
  )
}
