import { useRef, useState } from 'react'
import { chatProfiles, initialChatMessages } from '../../data/chat'
import type { ChatMessage, ChatProfileId } from '../../data/types'
import { ChatAvatar } from './chat-avatar'
import { ChatComposer } from './chat-composer'
import { MessageList } from './message-list'
import { ProfileList } from './profile-list'

function createInitialMessages(): Record<ChatProfileId, ChatMessage[]> {
  return {
    assistant: initialChatMessages.assistant.map((message) => ({ ...message })),
    owner: initialChatMessages.owner.map((message) => ({ ...message })),
  }
}

export function ChatShell() {
  const [activeProfileId, setActiveProfileId] =
    useState<ChatProfileId>('assistant')
  const [messages, setMessages] = useState(createInitialMessages)
  const [drafts, setDrafts] = useState<Record<ChatProfileId, string>>({
    assistant: '',
    owner: '',
  })
  const nextMessageId = useRef(0)

  const activeProfile =
    chatProfiles.find((profile) => profile.id === activeProfileId) ??
    chatProfiles[0]
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
    }

    setMessages((current) => ({
      ...current,
      [activeProfileId]: [...current[activeProfileId], message],
    }))
    setDrafts((current) => ({ ...current, [activeProfileId]: '' }))
  }

  function updateDraft(value: string) {
    setDrafts((current) => ({ ...current, [activeProfileId]: value }))
  }

  return (
    <section
      aria-label="Chat preview"
      className="mt-10 flex h-[min(620px,calc(100dvh-22rem))] min-h-[440px] flex-col overflow-hidden border border-line bg-surface/20 md:grid md:grid-cols-[280px_minmax(0,1fr)]"
    >
      <div className="border-b border-line p-3 md:border-b-0 md:border-r md:p-4">
        <ProfileList
          profiles={chatProfiles}
          activeProfileId={activeProfileId}
          onSelect={setActiveProfileId}
        />
        <p className="mt-4 hidden font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted md:block">
          Two threads. One preview.
          <br />
          No account required.
        </p>
      </div>

      <section
        id="chat-thread"
        aria-labelledby="chat-thread-title"
        className="flex min-h-0 flex-1 flex-col"
      >
        <header className="flex items-center gap-3 border-b border-line p-4">
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

        <p className="border-b border-line bg-canvas/40 px-4 py-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-muted">
          <span
            className="mr-2 inline-block size-1.5 bg-accent align-middle"
            aria-hidden="true"
          />
          <span>
            Preview — messages stay on this page and are not sent.
          </span>
        </p>

        <MessageList messages={activeMessages} profile={activeProfile} />
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
