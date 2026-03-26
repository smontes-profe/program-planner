# RLS Policy Patterns

## Table of Contents

1. Common Helper Function Pattern
2. Ownership Policy Pattern
3. Organization Membership Policy Pattern
4. Visibility Scope Read Pattern
5. Write Guard Pattern

## 1. Common Helper Function Pattern

```sql
create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;
```

## 2. Ownership Policy Pattern

```sql
create policy teaching_plan_owner_update
on public.teaching_plans
for update
using (owner_profile_id = public.current_profile_id())
with check (owner_profile_id = public.current_profile_id());
```

## 3. Organization Membership Policy Pattern

```sql
create policy teaching_plan_same_org_read
on public.teaching_plans
for select
using (
  exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = teaching_plans.organization_id
      and m.profile_id = public.current_profile_id()
      and m.is_active = true
  )
);
```

## 4. Visibility Scope Read Pattern

```sql
create policy teaching_plan_visibility_read
on public.teaching_plans
for select
using (
  owner_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.profiles p
    where p.id = public.current_profile_id()
      and p.is_platform_admin = true
  )
  or (
    visibility_scope = 'organization'
    and exists (
      select 1
      from public.organization_memberships m
      where m.organization_id = teaching_plans.organization_id
        and m.profile_id = public.current_profile_id()
        and m.is_active = true
    )
  )
  or (
    visibility_scope = 'company'
    and exists (
      select 1
      from public.organization_memberships m
      where m.profile_id = public.current_profile_id()
        and m.is_active = true
    )
  )
);
```

## 5. Write Guard Pattern

```sql
create policy teaching_plan_insert_guard
on public.teaching_plans
for insert
with check (
  owner_profile_id = public.current_profile_id()
  and exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = teaching_plans.organization_id
      and m.profile_id = public.current_profile_id()
      and m.is_active = true
  )
);
```
