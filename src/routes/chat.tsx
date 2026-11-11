import { createFileRoute } from '@tanstack/react-router'
import { ChatShell } from '../components/chat/chat-shell'
import { pageHead } from '../lib/seo'

export const Route = createFileRoute('/chat')({
  head: () =>
    pageHead(
      'Chat — Gopendranath Sasmal',
      'Preview the portfolio assistant and a direct owner thread. Messages stay on the page and are not sent.',
    ),
  component: ChatPage,
})

export function ChatPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatShell />
    </div>
  )
}
