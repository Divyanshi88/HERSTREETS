create or replace function public.get_my_reports()
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
    archive_status public.archive_status_type,
    deleted_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
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
        r.archive_status,
        r.deleted_at
    from public.reports r
    join public.report_categories c on c.id = r.category_id
    join public.report_values v on v.id = r.value_id
    where r.creator_id = auth.uid()
    order by r.created_at desc;
$$;

revoke all on function public.get_my_reports() from public, anon;
grant execute on function public.get_my_reports() to authenticated;

revoke all on function public.update_own_report(uuid, uuid, uuid, text, text, timestamptz) from public, anon;
grant execute on function public.update_own_report(uuid, uuid, uuid, text, text, timestamptz) to authenticated;
alter function public.update_own_report(uuid, uuid, uuid, text, text, timestamptz)
    set search_path = public, extensions, pg_temp;

revoke all on function public.delete_own_report(uuid) from public, anon;
grant execute on function public.delete_own_report(uuid) to authenticated;
alter function public.delete_own_report(uuid)
    set search_path = public, pg_temp;
