import { createFileRoute } from '@tanstack/react-router'
import { ChatShell } from '../components/chat/chat-shell'
import { PageHeader } from '../components/ui/page-header'
import { pageHead } from '../lib/seo'

export const Route = createFileRoute('/chat')({
  head: () =>
    pageHead(
      'Chat — Gopendranath Sasmal',
      'Preview the portfolio assistant and a direct owner thread. Messages stay on the page and are not sent.',
    ),
  component: ChatPage,
})

function ChatPage() {
  return (
    <div>
      <PageHeader
        eyebrow="05 / Chat"
        title="Chat."
        description="Preview two threads: the portfolio assistant and a direct line to the owner. Messages stay on this page until the authenticated backend ships."
      />

      <ChatShell />
    </div>
  )
}
