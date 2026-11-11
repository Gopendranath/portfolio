import { createFileRoute } from '@tanstack/react-router'
import { ChatPage } from '../components/chat/chat-page'
import { pageHead } from '../lib/seo'

export const Route = createFileRoute('/chat')({
  head: () =>
    pageHead(
      'Chat — Gopendranath Sasmal',
      'Preview the portfolio assistant and a direct owner thread. Messages stay on the page and are not sent.',
    ),
  component: ChatPage,
})
