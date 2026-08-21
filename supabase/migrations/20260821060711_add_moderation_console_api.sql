alter table public.moderation_actions
    add constraint moderation_actions_reason_code_check
    check (
        reason_code is null
        or reason_code in (
            'inaccurate',
            'harassment_or_targeting',
            'personal_information',
            'duplicate',
            'expired_or_outdated',
            'insufficient_detail',
            'other'
        )
    );

alter table public.moderation_actions
    add constraint moderation_actions_reason_text_length_check
    check (reason_text is null or char_length(reason_text) <= 500);

create or replace function public.get_moderation_queue(p_status text default 'pending')
returns table(
    id uuid,
    category_id uuid,
    category_name text,
    value_id uuid,
    observation_name text,
    public_location_label text,
    comment text,
    observed_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz,
    verification_status public.verification_status_type,
    moderation_status public.moderation_status_type,
    confirmation_count integer,
    disagreement_count integer,
    expires_at timestamptz,
    archive_status public.archive_status_type
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null or not public.is_moderator() then
        raise exception 'Moderator permission required';
    end if;

    if p_status is not null
       and p_status <> 'all'
       and p_status not in ('pending', 'approved', 'rejected', 'hidden', 'archived')
    then
        raise exception 'Invalid moderation status';
    end if;

    return query
    select
        r.id,
        r.category_id,
        c.display_name,
        r.value_id,
        v.display_name,
        r.public_location_label,
        r.comment,
        r.observed_at,
        r.created_at,
        r.updated_at,
        r.verification_status,
        r.moderation_status,
        r.confirmation_count,
        r.disagreement_count,
        r.expires_at,
        r.archive_status
    from public.reports r
    join public.report_categories c on c.id = r.category_id
    join public.report_values v on v.id = r.value_id
    where r.deleted_at is null
      and (p_status is null or p_status = 'all' or r.moderation_status = p_status::public.moderation_status_type)
    order by
        case when r.moderation_status = 'pending' then 0 else 1 end,
        r.created_at asc;
end;
$$;

create or replace function public.get_report_moderation_history(p_report_id uuid)
returns table(
    id uuid,
    report_id uuid,
    action text,
    reason_code text,
    reason_text text,
    previous_status public.moderation_status_type,
    new_status public.moderation_status_type,
    created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null or not public.is_moderator() then
        raise exception 'Moderator permission required';
    end if;

    return query
    select
        ma.id,
        ma.report_id,
        ma.action,
        ma.reason_code,
        ma.reason_text,
        ma.previous_status,
        ma.new_status,
        ma.created_at
    from public.moderation_actions ma
    where ma.report_id = p_report_id
    order by ma.created_at desc;
end;
$$;

revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;
alter function public.is_moderator() set search_path = public, pg_temp;

revoke all on function public.moderate_report(uuid, text, text, text) from public, anon;
grant execute on function public.moderate_report(uuid, text, text, text) to authenticated;
alter function public.moderate_report(uuid, text, text, text) set search_path = public, pg_temp;

revoke all on function public.get_moderation_queue(text) from public, anon;
grant execute on function public.get_moderation_queue(text) to authenticated;

revoke all on function public.get_report_moderation_history(uuid) from public, anon;
grant execute on function public.get_report_moderation_history(uuid) to authenticated;
