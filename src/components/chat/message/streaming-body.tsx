export function StreamingBody({ body }: { body: string }) {
  if (!body) {
    return (
      <span className="inline-flex items-center gap-1 text-muted">
        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
        <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:120ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:240ms]" />
      </span>
    )
  }

  return (
    <>
      {body}
      <span
        aria-hidden="true"
        className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-accent align-[-2px] motion-reduce:animate-none"
      />
    </>
  )
}
