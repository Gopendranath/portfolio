alter table conversations
  add column if not exists title text
  check (title is null or char_length(title) between 1 and 80);

alter table conversations
  drop constraint if exists conversations_user_id_kind_key;

create unique index if not exists conversations_owner_per_user_idx
  on conversations (user_id)
  where kind = 'owner';

create index if not exists conversations_user_kind_recent_idx
  on conversations (user_id, kind, last_message_at desc, id desc);

-- Old chat reads created assistant conversations before the first message.
-- They have no history value and would never be selectable.
delete from conversations c
 where c.kind = 'assistant'
   and not exists (
     select 1 from messages m where m.conversation_id = c.id
   );

update conversations c
   set title = (
     select left(regexp_replace(m.body, '\s+', ' ', 'g'), 80)
       from messages m
      where m.conversation_id = c.id
        and m.author = 'user'
        and m.deleted_at is null
      order by m.seq
      limit 1
   )
 where c.kind = 'assistant'
   and c.title is null
   and exists (
     select 1 from messages m
      where m.conversation_id = c.id
        and m.author = 'user'
        and m.deleted_at is null
   );

update conversations
   set title = 'Earlier conversation'
 where kind = 'assistant'
   and title is null;

insert into schema_migrations (name) values ('004_assistant_chat_history.sql')
on conflict (name) do nothing;
