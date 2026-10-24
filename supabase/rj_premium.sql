-- Rajasthan Job: paid job details (HR contact, career page, hiring tips).
-- STANDALONE: run in the SQL Editor of the NEW Supabase project made for Rajasthan Job. Safe to re-run.

-- 0) who is an admin (only these emails can write premium data and read payments)
create table if not exists admins(email text primary key);
alter table admins enable row level security;
create or replace function is_admin() returns boolean language sql security definer stable set search_path = public as
$$select exists(select 1 from admins a where a.email = lower(auth.jwt()->>'email'))
   and exists(select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null)$$;
drop policy if exists a_admins on admins;
create policy a_admins on admins for select using(is_admin());
revoke all on admins from anon;
grant select on admins to authenticated;
-- AFTER creating your admin user (Authentication > Users > Add user), run once with YOUR email:
--   insert into admins values ('you@email.com');

create table if not exists rj_job_premium(
  job_id text primary key,                         -- Firestore jobs/<id>
  job_title text,
  hr_name text, hr_phone text, hr_whatsapp text, hr_email text,
  career_url text, insider_note text,
  price int not null default 10 check (price between 1 and 999),   -- rupees
  updated_at timestamptz default now());
alter table rj_job_premium enable row level security;
drop policy if exists rjp_admin on rj_job_premium;
create policy rjp_admin on rj_job_premium for all using(is_admin()) with check(is_admin());
revoke all on rj_job_premium from anon;
grant select, insert, update, delete on rj_job_premium to authenticated;

-- one row per verified payment (written only by the rj-job-reveal function)
create table if not exists rj_payments(
  payment_id text primary key, order_id text, job_id text,
  email text, phone text, amount int, created_at timestamptz default now());
alter table rj_payments enable row level security;
drop policy if exists rjpay_admin on rj_payments;
create policy rjpay_admin on rj_payments for select using(is_admin());
revoke all on rj_payments from anon;
grant select on rj_payments to authenticated;

-- Public: tells the website WHICH jobs have a paid block, its price and a list of labels. Never returns the data itself.
create or replace function rj_premium_status(p_ids text[])
returns table(job_id text, price int, fields text[])
language sql security definer stable set search_path = public as $$
  select t.job_id, t.price, t.fields from (
    select p.job_id, p.price, array_remove(array[
      case when coalesce(p.hr_name,'')      <> '' then 'HR name' end,
      case when coalesce(p.hr_phone,'')     <> '' then 'Phone' end,
      case when coalesce(p.hr_whatsapp,'')  <> '' then 'WhatsApp' end,
      case when coalesce(p.hr_email,'')     <> '' then 'Email' end,
      case when coalesce(p.career_url,'')   <> '' then 'Company career page' end,
      case when coalesce(p.insider_note,'') <> '' then 'Hiring tips' end], null) as fields
    from rj_job_premium p
    where cardinality(p_ids) <= 50 and p.job_id = any(p_ids)) t
  where cardinality(t.fields) > 0
$$;
revoke all on function rj_premium_status(text[]) from public;
grant execute on function rj_premium_status(text[]) to anon, authenticated;
