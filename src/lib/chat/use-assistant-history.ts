import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { ChatApiError, chatFetch } from './api-client'
import type { AssistantConversationPage } from './protocol'

export function useAssistantConversations(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['chat', 'assistant-conversations'],
    queryFn: ({ pageParam }) =>
      chatFetch<AssistantConversationPage>(
        `/api/conversations/assistant?limit=20${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useDeleteAssistantConversation() {
  const queryClient = useQueryClient()

  return useCallback(
    async (conversationId: string) => {
      try {
        await chatFetch(`/api/conversations/${conversationId}`, {
          method: 'DELETE',
        })
      } catch (error) {
        // A chat deleted in another tab is already in the desired state.
        if (!(error instanceof ChatApiError) || error.code !== 'NOT_FOUND') {
          throw error
        }
      }
      await queryClient.invalidateQueries({
        queryKey: ['chat', 'assistant-conversations'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', 'assistant', conversationId],
      })
    },
    [queryClient],
  )
}
