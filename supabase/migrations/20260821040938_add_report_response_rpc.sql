create or replace function public.respond_to_report(
    p_report_id uuid,
    p_response text
)
returns table(
    confirmation_count integer,
    disagreement_count integer,
    current_response public.report_confirmation_type
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    requesting_user_id uuid := auth.uid();
    target_report public.reports%rowtype;
    existing_confirmation public.report_confirmations%rowtype;
    parsed_response public.report_confirmation_type;
begin
    if requesting_user_id is null then
        raise exception 'Sign in before responding to an observation';
    end if;

    if p_response not in ('confirmed', 'changed') then
        raise exception 'Response must be confirmed or changed';
    end if;
    parsed_response := p_response::public.report_confirmation_type;

    select r.*
    into target_report
    from public.reports r
    where r.id = p_report_id
    for update;

    if not found
        or target_report.deleted_at is not null
        or target_report.moderation_status <> 'approved'
        or target_report.archive_status <> 'active'
        or target_report.expires_at <= now()
    then
        raise exception 'This observation is no longer available for community responses';
    end if;

    if target_report.creator_id = requesting_user_id then
        raise exception 'You cannot respond to your own observation';
    end if;

    select rc.*
    into existing_confirmation
    from public.report_confirmations rc
    where rc.report_id = p_report_id
      and rc.user_id = requesting_user_id
    for update;

    if found then
        if existing_confirmation.response = parsed_response then
            return query
            select r.confirmation_count, r.disagreement_count, parsed_response
            from public.reports r
            where r.id = p_report_id;
            return;
        end if;

        if existing_confirmation.updated_at > now() - interval '30 seconds' then
            raise exception 'Please wait before changing your response';
        end if;

        update public.report_confirmations rc
        set response = parsed_response,
            updated_at = now()
        where rc.id = existing_confirmation.id;
    else
        insert into public.report_confirmations (report_id, user_id, response)
        values (p_report_id, requesting_user_id, parsed_response);
    end if;

    return query
    select r.confirmation_count, r.disagreement_count, parsed_response
    from public.reports r
    where r.id = p_report_id;
end;
$$;

revoke all on function public.respond_to_report(uuid, text) from public, anon;
grant execute on function public.respond_to_report(uuid, text) to authenticated;
