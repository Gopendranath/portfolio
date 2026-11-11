import type { ChatMessage, ChatProfile, ChatProfileId } from './types'

export const chatProfilesById: Record<ChatProfileId, ChatProfile> = {
  assistant: {
    id: 'assistant',
    name: 'Portfolio assistant',
    role: 'AI guide',
  },
  owner: {
    id: 'owner',
    name: 'Gopendranath Sasmal',
    role: 'Owner',
  },
}

export const chatProfiles: readonly ChatProfile[] = [
  chatProfilesById.assistant,
  chatProfilesById.owner,
]

/**
 * Seed messages are offset from `now` so the preview always reads as recent
 * activity. Pass a fixed timestamp in tests to keep assertions deterministic.
 */
export function createInitialChatMessages(
  now: number = Date.now(),
): Record<ChatProfileId, ChatMessage[]> {
  return {
    assistant: [
      {
        id: 'assistant-1',
        author: 'assistant',
        body: 'Hi — I’m the portfolio assistant. Ask me about projects, stack choices, or availability.',
        sentAt: now - 6 * 60_000,
      },
      {
        id: 'assistant-2',
        author: 'user',
        body: 'What is terminal-web-vm?',
        sentAt: now - 5 * 60_000,
      },
      {
        id: 'assistant-3',
        author: 'assistant',
        body: 'A browser-based Debian lab running entirely client-side with CheerpX and WebContainers. Stack: TypeScript, WebAssembly, and xterm.',
        sentAt: now - 4 * 60_000,
      },
    ],
    owner: [
      {
        id: 'owner-1',
        author: 'owner',
        body: 'This is the owner thread preview. Once chat is connected, messages here go directly to Gopendranath.',
        sentAt: now - 5 * 60_000,
      },
      {
        id: 'owner-2',
        author: 'owner',
        body: 'For now, try the composer — everything stays on this page and nothing is sent.',
        sentAt: now - 4 * 60_000,
      },
    ],
  }
}
