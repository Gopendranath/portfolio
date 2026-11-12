import { useQuery, useQueryClient } from '@tanstack/react-query'
import { chatFetch } from './api-client'
import { authClient } from './auth-client'

export interface MeResponse {
  user: {
    id: string
    githubLogin: string | null
    githubCreatedAt: string | null
    role: 'user' | 'owner'
  }
  isOwner: boolean
  aiEligible: boolean
  aiReason: string
  ownerUnreadCount: number
}

export interface ChatSessionState {
  user: MeResponse['user'] | null
  token: string | null
  isOwner: boolean
  aiEligible: boolean
  aiReason: string
  ownerUnreadCount: number
  isLoading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export function useChatSession(): ChatSessionState {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: ['chat', 'session'],
    queryFn: async () => {
      const { data, error } = await authClient.getSession()
      if (error) {
        throw new Error(error.message)
      }
      return data
    },
    staleTime: 30_000,
    retry: false,
  })

  const token = sessionQuery.data?.session?.token ?? null

  const meQuery = useQuery({
    queryKey: ['chat', 'me'],
    queryFn: () => chatFetch<MeResponse>('/api/me', {}, token ?? undefined),
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false,
  })

  async function signIn() {
    await authClient.signIn.social({
      provider: 'github',
      callbackURL: `${window.location.origin}/chat`,
    })
  }

  async function signOut() {
    await authClient.signOut()
    queryClient.removeQueries({ queryKey: ['chat'] })
  }

  const error =
    sessionQuery.error instanceof Error
      ? sessionQuery.error.message
      : meQuery.error instanceof Error
        ? meQuery.error.message
        : null

  return {
    user: meQuery.data?.user ?? null,
    token,
    isOwner: meQuery.data?.isOwner ?? false,
    aiEligible: meQuery.data?.aiEligible ?? false,
    aiReason: meQuery.data?.aiReason ?? 'github_check_unavailable',
    ownerUnreadCount: meQuery.data?.ownerUnreadCount ?? 0,
    isLoading: sessionQuery.isLoading || (Boolean(token) && meQuery.isLoading),
    error,
    signIn,
    signOut,
  }
}
