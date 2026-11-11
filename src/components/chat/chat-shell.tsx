import { useRef, useState } from 'react'
import {
  chatProfiles,
  chatProfilesById,
  createInitialChatMessages,
} from '@/data/chat'
import type { ChatMessage, ChatProfileId } from '@/data/types'
import { ChatAvatar } from './chat-avatar'
import { ChatComposer } from './chat-composer'
import { MessageList } from './message-list'
import { ProfileList } from './profile-list'
import './chat-shell.css'

export function ChatShell() {
  const [activeProfileId, setActiveProfileId] =
    useState<ChatProfileId>('assistant')
  const [messages, setMessages] = useState(createInitialChatMessages)
  const [drafts, setDrafts] = useState<Record<ChatProfileId, string>>({
    assistant: '',
    owner: '',
  })
  const nextMessageId = useRef(0)

  const activeProfile = chatProfilesById[activeProfileId]
  const activeMessages = messages[activeProfileId]
  const activeDraft = drafts[activeProfileId]

  function sendMessage() {
    const body = activeDraft.trim()

    if (!body) {
      return
    }

    nextMessageId.current += 1

    const message: ChatMessage = {
      id: `local-${nextMessageId.current}`,
      author: 'user',
      body,
      sentAt: Date.now(),
    }

    setMessages((current) => ({
      ...current,
      [activeProfileId]: [...current[activeProfileId], message],
    }))
    setDrafts((current) => ({ ...current, [activeProfileId]: '' }))
  }

  function editMessage(id: string, body: string) {
    setMessages((current) => ({
      ...current,
      [activeProfileId]: current[activeProfileId].map((message) =>
        message.id === id
          ? { ...message, body, editedAt: Date.now() }
          : message,
      ),
    }))
  }

  function updateDraft(value: string) {
    setDrafts((current) => ({ ...current, [activeProfileId]: value }))
  }

  return (
    <section
      aria-label="Chat preview"
      className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[280px_minmax(0,1fr)]"
    >
      <div className="chat-profile-panel flex shrink-0 flex-col border-b border-line p-4 md:border-b-0 md:border-r">
        <div className="chat-profile-heading shrink-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
            05 / Chat
          </p>
          <h1 className="mt-1 text-xl font-medium tracking-[-0.02em] text-ink">
            Chat.
          </h1>
        </div>

        <div className="chat-profile-list mt-4">
          <ProfileList
            profiles={chatProfiles}
            activeProfileId={activeProfileId}
            onSelect={setActiveProfileId}
          />
        </div>
      </div>

      <section
        id="chat-thread"
        aria-labelledby="chat-thread-title"
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <header className="chat-thread-header hidden shrink-0 items-center gap-3 border-b border-line p-4 md:flex">
          <ChatAvatar profile={activeProfile} />
          <div className="min-w-0">
            <h2
              id="chat-thread-title"
              className="truncate text-sm font-medium text-ink"
            >
              {activeProfile.name}
            </h2>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              {activeProfile.role}
            </p>
          </div>
        </header>

        <MessageList
          messages={activeMessages}
          profile={activeProfile}
          onEditMessage={editMessage}
        />
        <ChatComposer
          profileName={activeProfile.name}
          value={activeDraft}
          onChange={updateDraft}
          onSend={sendMessage}
        />
      </section>
    </section>
  )
}
