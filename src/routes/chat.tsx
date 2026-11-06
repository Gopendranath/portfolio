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

function ChatPage() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden lg:h-dvh">
      <ChatShell />
    </div>
  )
}
