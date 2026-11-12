import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { chatFetch } from './api-client'
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
      await chatFetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      })
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
