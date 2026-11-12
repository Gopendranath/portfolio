alter table messages
  drop constraint if exists messages_body_check;

alter table messages
  add constraint messages_body_check check (
    (author in ('user', 'owner') and char_length(body) <= 2000)
    or (author = 'assistant' and char_length(body) <= 6000)
  );
