import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { chatFetch } from './api-client'

export function useOwnerReadReceipt(input: {
  active: boolean
  token: string | null
  isOwner: boolean
  latestMessageId: string | undefined
}) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (
      !input.active ||
      !input.token ||
      input.isOwner ||
      !input.latestMessageId
    ) {
      return
    }

    void chatFetch('/api/conversations/owner/read', { method: 'POST' })
      .then(() => queryClient.invalidateQueries({ queryKey: ['chat', 'me'] }))
      .catch(() => {})
  }, [
    input.active,
    input.isOwner,
    input.latestMessageId,
    input.token,
    queryClient,
  ])
}
