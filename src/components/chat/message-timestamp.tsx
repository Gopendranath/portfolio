import type { ChatMessage } from '../../data/types'

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatTime(timestamp: number) {
  return timeFormatter.format(timestamp)
}

export function MessageTimestamp({ message }: { message: ChatMessage }) {
  return (
    <span className="whitespace-nowrap">
      {message.editedAt !== undefined ? (
        <>
          edited{' '}
          <time dateTime={new Date(message.editedAt).toISOString()}>
            {formatTime(message.editedAt)}
          </time>
        </>
      ) : (
        <time dateTime={new Date(message.sentAt).toISOString()}>
          {formatTime(message.sentAt)}
        </time>
      )}
    </span>
  )
}
