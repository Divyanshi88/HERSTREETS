-- Trigger functions are invoked by PostgreSQL, not directly through the Data API.
alter function public.prevent_self_confirmation()
set search_path = public;

alter function public.refresh_report_confirmation_counts()
set search_path = public;

revoke execute on function public.prevent_self_confirmation() from public, anon, authenticated;
revoke execute on function public.refresh_report_confirmation_counts() from public, anon, authenticated;

-- These privileged helpers require an authenticated user and enforce ownership or
-- moderator authorization internally. Do not expose them to anonymous callers.
revoke execute on function public.register_report_photo(uuid, text, text, bigint, integer, integer)
from public, anon;
grant execute on function public.register_report_photo(uuid, text, text, bigint, integer, integer)
to authenticated;

revoke execute on function public.moderate_report_photo(uuid, text)
from public, anon;
grant execute on function public.moderate_report_photo(uuid, text)
to authenticated;
