create unique index if not exists messages_assistant_active_reply_idx
  on messages (reply_to_id)
  where author = 'assistant'
    and reply_to_id is not null
    and status in ('streaming', 'complete');
