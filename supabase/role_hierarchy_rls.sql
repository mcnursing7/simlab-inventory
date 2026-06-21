-- ================================================================
-- Role-hierarchy enforcement at the DATABASE level
-- This is a defense-in-depth measure: even if the frontend is bypassed,
-- Postgres itself will refuse to let a lower-rank user modify a
-- same-or-higher-rank profile.
-- ================================================================

-- Helper function: get the rank of a role
create or replace function public.role_rank(r text)
returns int language sql immutable as $$
  select case r
    when 'admin' then 3
    when 'manager' then 2
    when 'lab_staff' then 1
    else 0
  end;
$$;

-- Drop the old manager-update policy and replace with a hierarchy-aware one
drop policy if exists "profiles_update_managers" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Users can always update their own profile EXCEPT they cannot change their own role
-- (prevents self-promotion) — enforced by checking role stays the same in the new row
create policy "profiles_update_self_no_role_change" on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- Admins/managers can update OTHER profiles only if their rank is strictly
-- greater than the target's CURRENT rank (checked via using clause)
create policy "profiles_update_by_higher_rank" on public.profiles
  for update
  using (
    id <> auth.uid()
    and public.role_rank(
      (select role from public.profiles where id = auth.uid())
    ) > public.role_rank(role)
  );

-- ── VERIFY ────────────────────────────────────────────────────
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'profiles';
