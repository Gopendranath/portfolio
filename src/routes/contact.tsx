import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/contact')({
  head: () => ({
    meta: [
      { title: 'Contact — Gopendranath Sasmal' },
      {
        name: 'description',
        content:
          'Get in touch with Gopendranath Sasmal about full-stack roles, product work, and collaborations.',
      },
    ],
  }),
  component: ContactPage,
})

function ContactPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-medium text-ink">Contact</h1>
    </section>
  )
}
