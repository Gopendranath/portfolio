import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { chatFetch } from './api-client'
import type { OwnerThreadPage } from './protocol'

export function useOwnerThreads(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['chat', 'owner-threads'],
    queryFn: ({ pageParam }) =>
      chatFetch<OwnerThreadPage>(
        `/api/owner/threads?limit=20${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    refetchInterval: enabled ? 10_000 : false,
    staleTime: 0,
    retry: false,
  })
}

export function useMarkOwnerThreadRead() {
  const queryClient = useQueryClient()

  return useCallback(
    async (userId: string) => {
      await chatFetch(`/api/owner/threads/${userId}/read`, { method: 'POST' })
      await queryClient.invalidateQueries({
        queryKey: ['chat', 'owner-threads'],
      })
    },
    [queryClient],
  )
}

export function useMarkOwnerThreadUnread() {
  const queryClient = useQueryClient()

  return useCallback(
    async (userId: string) => {
      await chatFetch(`/api/owner/threads/${userId}/unread`, { method: 'POST' })
      await queryClient.invalidateQueries({
        queryKey: ['chat', 'owner-threads'],
      })
    },
    [queryClient],
  )
}
