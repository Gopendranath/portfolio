import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'About — Gopendranath Sasmal' },
      {
        name: 'description',
        content:
          'About Gopendranath Sasmal, a full-stack developer focused on React, TypeScript, Node.js, AI, and maintainable product work.',
      },
    ],
  }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-medium text-ink">About</h1>
    </section>
  )
}
