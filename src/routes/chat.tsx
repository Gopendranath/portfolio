import { createFileRoute } from '@tanstack/react-router'
import { ChatShell } from '@/components/chat/chat-shell'
import { pageMeta } from '@/data/pages'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/chat')({
  head: () =>
    pageHead(
      pageMeta.chat.title,
      pageMeta.chat.description,
      pageMeta.chat.path,
    ),
  component: ChatShell,
})
