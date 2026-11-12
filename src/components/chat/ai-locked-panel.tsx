interface AiLockedPanelProps {
  reason: string
  onOpenOwner: () => void
}

export function AiLockedPanel({ reason, onOpenOwner }: AiLockedPanelProps) {
  const tooNew = reason === 'account_too_new'
  const title = tooNew ? 'Assistant unlocks after one year.' : 'Assistant unavailable.'
  const body = tooNew
    ? 'Your GitHub account is newer than one year. You can still message the owner directly.'
    : 'We could not verify your GitHub account age right now. You can still message the owner directly.'

  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">AI assistant</p>
      <h2 className="max-w-sm text-lg font-medium text-ink">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      <button
        type="button"
        onClick={onOpenOwner}
        className="border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink transition-colors hover:border-accent hover:text-accent"
      >
        Message the owner
      </button>
    </section>
  )
}
