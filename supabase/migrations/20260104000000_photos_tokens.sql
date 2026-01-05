create table if not exists public.photos_tokens (
  id uuid primary key default gen_random_uuid(),
  google_user_id text not null unique,
  refresh_token text not null,
  access_token text,
  token_expires_at timestamptz,
  profile_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.photos_tokens_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end
$$ language plpgsql;

create trigger photos_tokens_set_updated
before update on public.photos_tokens
for each row execute procedure public.photos_tokens_updated_at();
