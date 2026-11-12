create extension if not exists pgcrypto;

create table if not exists schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text unique not null,
  github_id bigint unique not null,
  github_login text,
  github_created_at timestamptz,
  github_checked_at timestamptz,
  role text not null default 'user' check (role in ('user', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('owner', 'assistant')),
  user_id uuid not null references app_users(id) on delete cascade,
  user_last_read_at timestamptz,
  owner_last_read_at timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  seq bigserial unique not null,
  conversation_id uuid not null references conversations(id) on delete cascade,
  author text not null check (author in ('user', 'owner', 'assistant')),
  body text not null check (char_length(body) <= 2000),
  status text not null default 'complete' check (
    status in ('complete', 'streaming', 'failed', 'superseded')
  ),
  client_id text,
  reply_to_id uuid references messages(id) on delete set null,
  model text,
  input_tokens integer,
  output_tokens integer,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_edited_after_created check (
    edited_at is null or edited_at >= created_at
  ),
  constraint messages_complete_body_not_empty check (
    status <> 'complete' or char_length(body) > 0
  )
);

create unique index if not exists messages_conversation_client_id_idx
  on messages (conversation_id, client_id)
  where client_id is not null;

create index if not exists messages_conversation_seq_idx
  on messages (conversation_id, seq desc);

create index if not exists messages_conversation_created_idx
  on messages (conversation_id, created_at desc);

create table if not exists message_revisions (
  id bigserial primary key,
  message_id uuid not null references messages(id) on delete cascade,
  body text not null,
  edited_by_user_id uuid references app_users(id) on delete set null,
  edited_at timestamptz not null default now()
);

create index if not exists message_revisions_message_idx
  on message_revisions (message_id, edited_at desc);

create table if not exists rate_limit_events (
  id bigserial primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_user_action_idx
  on rate_limit_events (user_id, action, created_at desc);

create table if not exists ai_usage (
  user_id uuid not null references app_users(id) on delete cascade,
  day date not null,
  requests integer not null default 0,
  output_tokens integer not null default 0,
  last_request_at timestamptz,
  primary key (user_id, day)
);

create table if not exists global_ai_usage (
  window_start timestamptz not null,
  window_kind text not null check (window_kind in ('minute', 'day')),
  requests integer not null default 0,
  primary key (window_start, window_kind)
);

insert into schema_migrations (name) values ('001_chat.sql')
on conflict (name) do nothing;
