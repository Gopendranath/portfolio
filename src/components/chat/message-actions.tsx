import { Tooltip, TooltipTrigger } from '../ui/tooltip'

interface MessageActionsProps {
  canEdit: boolean
  copyLabel: string
  onCopy: () => void
  onEdit: () => void
}

export function MessageActions({
  canEdit,
  copyLabel,
  onCopy,
  onEdit,
}: MessageActionsProps) {
  return (
    <div className="flex items-center gap-1 opacity-100 transition-opacity md:pointer-events-none md:opacity-0 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100 md:group-hover:pointer-events-auto md:group-hover:opacity-100">
      <Tooltip label="Copy message">
        <TooltipTrigger
          type="button"
          aria-label="Copy message"
          onClick={onCopy}
          className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
        >
          {copyLabel}
        </TooltipTrigger>
      </Tooltip>
      {canEdit ? (
        <Tooltip label="Edit message">
          <TooltipTrigger
            type="button"
            aria-label="Edit message"
            onClick={onEdit}
            className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Edit
          </TooltipTrigger>
        </Tooltip>
      ) : null}
    </div>
  )
}
