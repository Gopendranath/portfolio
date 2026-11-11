import { useEffect, useState } from 'react'

type CopyStatus = 'idle' | 'copied' | 'failed'

interface CopyFeedback {
  body: string
  status: Exclude<CopyStatus, 'idle'>
}

export function useCopyFeedback(body: string) {
  const [feedback, setFeedback] = useState<CopyFeedback | null>(null)

  // Feedback belongs to the body that was copied, so editing the message
  // clears the label without an extra render pass.
  const copyStatus: CopyStatus =
    feedback && feedback.body === body ? feedback.status : 'idle'

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timer = window.setTimeout(() => setFeedback(null), 1600)

    return () => window.clearTimeout(timer)
  }, [feedback])

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(body)
      setFeedback({ body, status: 'copied' })
    } catch {
      setFeedback({ body, status: 'failed' })
    }
  }

  const copyLabel =
    copyStatus === 'copied'
      ? 'Copied'
      : copyStatus === 'failed'
        ? 'Copy failed'
        : 'Copy'

  const copyAnnouncement =
    copyStatus === 'copied'
      ? 'Message copied'
      : copyStatus === 'failed'
        ? 'Copy failed'
        : ''

  return { copyLabel, copyAnnouncement, copyMessage }
}
