import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Gopendranath Sasmal — Full Stack Developer' },
      {
        name: 'description',
        content:
          'Full-stack developer in Bengaluru building web products across React, TypeScript, Node.js, and AI. Open to full-stack roles.',
      },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-medium text-ink">Home</h1>
    </section>
  )
}
