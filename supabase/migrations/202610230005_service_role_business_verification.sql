create or replace function public.prevent_business_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status
    and auth.role() <> 'service_role'
    and not (public.has_role('moderator') or public.has_role('administrator')) then
    raise exception 'Only platform moderators can change verification status';
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'Business ownership cannot change';
  end if;

  return new;
end;
$$;
