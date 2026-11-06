import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/projects')({
  head: () => ({
    meta: [
      { title: 'Projects — Gopendranath Sasmal' },
      {
        name: 'description',
        content:
          'Selected full-stack projects across React, TypeScript, AI, WebAssembly, and browser tooling.',
      },
    ],
  }),
  component: ProjectsPage,
})

function ProjectsPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-medium text-ink">Projects</h1>
    </section>
  )
}
