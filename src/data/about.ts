export interface Principle {
  title: string
  body: string
}

export const principles: readonly Principle[] = [
  {
    title: 'Ship end to end',
    body: 'From the first component to the deployed service, I prefer owning the whole path.',
  },
  {
    title: 'Keep interfaces simple',
    body: 'Good abstractions make the next change cheaper. I optimize for that, not for cleverness.',
  },
  {
    title: 'Learn in public',
    body: 'New tools become useful when they turn into shipped work, not just notes.',
  },
]
