import type { ViewMessage } from '@/lib/chat/use-chat-thread'
import { MessageEditor } from './message-editor'
import { StreamingBody } from './streaming-body'
import type { MessageEditorState } from './use-message-editing'

export interface MessageBodyProps {
  message: ViewMessage
  isUser: boolean
  editor: MessageEditorState
}

export function MessageBody({ message, isUser, editor }: MessageBodyProps) {
  if (editor.isEditing) {
    return (
      <MessageEditor
        draft={editor.draft}
        onChange={editor.setDraft}
        onCancel={editor.cancelEditing}
        onSave={editor.saveEdit}
        onKeyDown={editor.handleEditorKeyDown}
      />
    )
  }

  return (
    <p
      className={`whitespace-pre-wrap break-words border px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface/70 text-ink'
      }`}
    >
      {message.status === 'streaming' ? <StreamingBody body={message.body} /> : message.body}
    </p>
  )
}
