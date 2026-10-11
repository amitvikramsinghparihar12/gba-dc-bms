-- GBA Corporation DC Bill Management System
-- Run this entire script in the Supabase SQL editor before `npm run seed`.

create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum (
    'Super Admin',
    'Director of Finance',
    'Finance Officer',
    'Creator',
    'Verifier',
    'Approver',
    'RTGS Manager'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type bill_status as enum (
    'Draft',
    'Pending Verification',
    'Pending Approval',
    'Pending RTGS',
    'Paid',
    'Rejected'
  );
exception when duplicate_object then null;
end $$;

create table if not exists departments (
  id varchar(32) primary key,
  name varchar(255) not null,
  created_at timestamptz not null default now()
);

create table if not exists ddos (
  id varchar(7) primary key check (id ~ '^[0-9]{6,7}$'),
  name varchar(255) not null,
  department_id varchar(32) not null references departments(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id varchar(64) primary key,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name varchar(255) not null,
  email varchar(255) unique not null,
  role user_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists user_ddo_mappings (
  user_id varchar(64) not null references profiles(id) on delete cascade,
  ddo_id varchar(7) not null references ddos(id) on delete cascade,
  primary key (user_id, ddo_id)
);

create table if not exists verifier_creator_mappings (
  verifier_id varchar(64) not null references profiles(id) on delete cascade,
  creator_id varchar(64) not null references profiles(id) on delete cascade,
  primary key (verifier_id, creator_id)
);

create table if not exists vendors (
  id varchar(32) primary key,
  name varchar(255) not null,
  type varchar(64) not null,
  gstin varchar(15) not null check (gstin ~ '^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
  bank_account_number varchar(32) not null check (bank_account_number ~ '^\d{9,18}$'),
  ifsc varchar(11) not null check (ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  bank_name varchar(128) not null,
  branch_name varchar(128) not null,
  address text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists vendor_documents (
  id bigserial primary key,
  vendor_id varchar(32) not null references vendors(id) on delete cascade,
  name varchar(255) not null,
  status varchar(32) not null check (status in ('Uploaded', 'Pending')),
  uploaded_at timestamptz
);

create table if not exists budget_grants (
  id varchar(64) primary key,
  financial_year varchar(16) not null,
  code varchar(16),
  name varchar(255),
  department_id varchar(32) references departments(id) on delete restrict,
  total_granted numeric(16, 2) not null check (total_granted > 0),
  created_at timestamptz not null default now()
);

create table if not exists ddo_allocations (
  id varchar(64) primary key,
  grant_id varchar(64) not null references budget_grants(id) on delete restrict,
  ddo_id varchar(7) not null unique references ddos(id) on delete restrict,
  allocated numeric(16, 2) not null check (allocated >= 0),
  utilized numeric(16, 2) not null default 0 check (utilized >= 0),
  updated_at timestamptz not null default now(),
  constraint chk_utilized_within_cap check (utilized <= allocated)
);

create table if not exists corporate_bank_accounts (
  id varchar(64) primary key,
  bank_name varchar(128) not null,
  account_number varchar(32) not null,
  ifsc varchar(11) not null,
  branch varchar(255) not null,
  account_type varchar(128) not null,
  is_active boolean not null default true
);

create table if not exists rtgs_batches (
  id varchar(64) primary key,
  bill_ids text[] not null,
  bank_account_id varchar(64) not null references corporate_bank_accounts(id),
  total_amount numeric(16, 2) not null check (total_amount > 0),
  beneficiary_count int not null check (beneficiary_count > 0),
  generated_by varchar(64) not null references profiles(id),
  generated_by_name varchar(255) not null,
  generated_at timestamptz not null default now()
);

create table if not exists bills (
  id varchar(64) primary key,
  ddo_id varchar(7) not null references ddos(id) on delete restrict,
  vendor_id varchar(32) references vendors(id) on delete restrict,
  work_order_no varchar(128) not null,
  work_order_date date not null,
  agreement_no varchar(128) not null,
  description text not null,
  base_value numeric(16, 2) not null check (base_value >= 0),
  cgst numeric(16, 2) not null default 0 check (cgst >= 0),
  sgst numeric(16, 2) not null default 0 check (sgst >= 0),
  igst numeric(16, 2) not null default 0 check (igst >= 0),
  gross_value numeric(16, 2) not null check (gross_value >= 0),
  total_deductions numeric(16, 2) not null default 0 check (total_deductions >= 0),
  net_payable numeric(16, 2) not null check (net_payable >= 0),
  status bill_status not null default 'Draft',
  rtgs_batch_id varchar(64) references rtgs_batches(id) on delete set null,
  created_by varchar(64) not null references profiles(id),
  created_by_name varchar(255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_gross_calculation check (gross_value = base_value + cgst + sgst + igst),
  constraint chk_net_calculation check (net_payable = gross_value - total_deductions)
);

create table if not exists bill_deductions (
  id bigserial primary key,
  bill_id varchar(64) not null references bills(id) on delete cascade,
  deduction_head_index int not null check (deduction_head_index between 1 and 16),
  label varchar(255) not null,
  amount numeric(16, 2) not null default 0 check (amount >= 0),
  unique (bill_id, deduction_head_index)
);

create table if not exists bill_attachments (
  id varchar(64) primary key,
  bill_id varchar(64) not null references bills(id) on delete cascade,
  name varchar(255) not null,
  size varchar(32) not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists bill_history (
  id varchar(64) primary key,
  bill_id varchar(64) not null references bills(id) on delete cascade,
  status bill_status not null,
  timestamp timestamptz not null default now(),
  user_id varchar(64) not null references profiles(id),
  user_name varchar(255) not null,
  user_role user_role not null,
  remarks text
);

create table if not exists budget_change_requests (
  id varchar(64) primary key,
  ddo_id varchar(7) not null references ddos(id),
  department_id varchar(32) not null references departments(id),
  type varchar(16) not null check (type in ('increase', 'decrease')),
  amount numeric(16, 2) not null check (amount > 0),
  reason text not null,
  status varchar(16) not null check (status in ('Pending', 'Approved', 'Rejected')),
  requested_by varchar(64) not null references profiles(id),
  requested_at timestamptz not null default now(),
  decided_by varchar(64) references profiles(id),
  decided_at timestamptz,
  remarks text
);

create table if not exists audit_logs (
  id varchar(64) primary key,
  timestamp timestamptz not null default now(),
  action_type varchar(64) not null,
  user_id varchar(64) not null references profiles(id),
  user_name varchar(255) not null,
  role user_role not null,
  entity_type varchar(64) not null,
  entity_id varchar(64) not null,
  old_value jsonb,
  new_value jsonb
);

create table if not exists workflow_config (
  id int primary key default 1 check (id = 1),
  verifier_enabled boolean not null default true,
  mandatory_remarks_min_length int not null default 10,
  financial_year varchar(16) not null default '2025-26',
  verifier_role user_role not null default 'Finance Officer',
  approver_role user_role not null default 'Director of Finance'
);

create table if not exists app_counters (
  key text primary key,
  value int not null
);

insert into workflow_config (id, verifier_enabled, mandatory_remarks_min_length, financial_year)
values (1, true, 10, '2025-26')
on conflict (id) do nothing;

insert into app_counters (key, value) values ('bill', 67), ('rtgs', 1)
on conflict (key) do nothing;

create index if not exists idx_bills_ddo on bills (ddo_id);
create index if not exists idx_bills_status on bills (status);
create index if not exists idx_bills_created_by on bills (created_by);
create index if not exists idx_audit_timestamp on audit_logs (timestamp desc);

-- Direct browser access with the anon key cannot read or write these tables.
-- The Next.js server uses the service role after checking the signed-in user.
alter table departments enable row level security;
alter table ddos enable row level security;
alter table profiles enable row level security;
alter table user_ddo_mappings enable row level security;
alter table verifier_creator_mappings enable row level security;
alter table vendors enable row level security;
alter table vendor_documents enable row level security;
alter table budget_grants enable row level security;
alter table ddo_allocations enable row level security;
alter table corporate_bank_accounts enable row level security;
alter table rtgs_batches enable row level security;
alter table bills enable row level security;
alter table bill_deductions enable row level security;
alter table bill_attachments enable row level security;
alter table bill_history enable row level security;
alter table budget_change_requests enable row level security;
alter table audit_logs enable row level security;
alter table workflow_config enable row level security;
alter table app_counters enable row level security;

revoke update, delete on audit_logs from anon, authenticated;

create or replace function reserve_budget(p_ddo_id text, p_gross numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v ddo_allocations%rowtype;
begin
  update ddo_allocations
  set utilized = round(utilized + p_gross, 2),
      updated_at = now()
  where ddo_id = p_ddo_id
    and (allocated - utilized) >= p_gross
  returning * into v;

  if not found then
    if not exists (select 1 from ddo_allocations where ddo_id = p_ddo_id) then
      raise exception 'No budget allocation found for DDO %.', p_ddo_id;
    end if;
    raise exception 'Insufficient DDO Budget Balance.';
  end if;

  return jsonb_build_object(
    'allocated', v.allocated,
    'utilized', v.utilized,
    'remaining', v.allocated - v.utilized
  );
end;
$$;

create or replace function release_budget(p_ddo_id text, p_gross numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v ddo_allocations%rowtype;
begin
  update ddo_allocations
  set utilized = greatest(0, round(utilized - p_gross, 2)),
      updated_at = now()
  where ddo_id = p_ddo_id
  returning * into v;

  if not found then
    raise exception 'No budget allocation found for DDO %.', p_ddo_id;
  end if;

  return jsonb_build_object(
    'allocated', v.allocated,
    'utilized', v.utilized,
    'remaining', v.allocated - v.utilized
  );
end;
$$;

create or replace function next_counter(p_key text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v int;
begin
  update app_counters set value = value + 1 where key = p_key returning value into v;
  if not found then
    raise exception 'Unknown counter %', p_key;
  end if;
  return v;
end;
$$;

create or replace function reject_bill(p_actor_id text, p_bill_id text, p_remarks text, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bill bills%rowtype;
  v_actor profiles%rowtype;
  v_alloc ddo_allocations%rowtype;
  v_prev bill_status;
begin
  select * into v_actor from profiles where id = p_actor_id;
  if not found then
    raise exception 'Actor not found.';
  end if;

  select * into v_bill from bills where id = p_bill_id for update;
  if not found then
    raise exception 'Bill % not found.', p_bill_id;
  end if;

  if v_bill.status not in ('Pending Verification', 'Pending Approval') then
    raise exception 'Cannot reject bill with status %.', v_bill.status;
  end if;

  v_prev := v_bill.status;

  update ddo_allocations
  set utilized = greatest(0, round(utilized - v_bill.gross_value, 2)),
      updated_at = now()
  where ddo_id = v_bill.ddo_id
  returning * into v_alloc;

  update bills
  set status = 'Rejected', updated_at = now()
  where id = p_bill_id;

  insert into bill_history (id, bill_id, status, timestamp, user_id, user_name, user_role, remarks)
  values (
    'H-' || replace(gen_random_uuid()::text, '-', ''),
    p_bill_id,
    'Rejected',
    now(),
    p_actor_id,
    v_actor.name,
    v_actor.role,
    p_remarks
  );

  insert into audit_logs (id, timestamp, action_type, user_id, user_name, role, entity_type, entity_id, old_value, new_value)
  values (
    'AUD-' || replace(gen_random_uuid()::text, '-', ''),
    now(),
    p_action,
    p_actor_id,
    v_actor.name,
    v_actor.role,
    'Bill',
    p_bill_id,
    jsonb_build_object('status', v_prev, 'grossValue', v_bill.gross_value),
    jsonb_build_object(
      'status', 'Rejected',
      'remarks', p_remarks,
      'ddoUtilizedReleased', v_bill.gross_value,
      'ddoRemainingNow', case when v_alloc.id is null then null else v_alloc.allocated - v_alloc.utilized end
    )
  );
end;
$$;

create or replace function update_ddo_allocation(p_actor_id text, p_allocation_id text, p_new_allocated numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alloc ddo_allocations%rowtype;
  v_grant budget_grants%rowtype;
  v_actor profiles%rowtype;
  v_others numeric;
  v_old numeric;
  v_available numeric;
begin
  select * into v_actor from profiles where id = p_actor_id;
  if not found or v_actor.role <> 'Finance Officer' then
    raise exception 'Forbidden: only a Finance Officer can change DDO allocations (HTTP 403)';
  end if;

  select * into v_alloc from ddo_allocations where id = p_allocation_id for update;
  if not found then
    raise exception 'DDO Allocation % not found.', p_allocation_id;
  end if;

  select * into v_grant from budget_grants where id = v_alloc.grant_id for update;
  if not found then
    raise exception 'Associated grant % not found.', v_alloc.grant_id;
  end if;

  if round(p_new_allocated, 2) < round(v_alloc.utilized, 2) then
    raise exception 'Cannot reduce allocation to ₹%. DDO has already utilized ₹%.',
      round(p_new_allocated, 2), round(v_alloc.utilized, 2);
  end if;

  select coalesce(sum(allocated), 0) into v_others
  from ddo_allocations
  where grant_id = v_grant.id and id <> p_allocation_id;

  if round(v_others + p_new_allocated, 2) > round(v_grant.total_granted, 2) then
    v_available := round(v_grant.total_granted - v_others, 2);
    raise exception 'Total budget-head allocations would exceed the head grant. Maximum available for this DDO is ₹%.', v_available;
  end if;

  v_old := v_alloc.allocated;

  update ddo_allocations
  set allocated = round(p_new_allocated, 2), updated_at = now()
  where id = p_allocation_id
  returning * into v_alloc;

  insert into audit_logs (id, timestamp, action_type, user_id, user_name, role, entity_type, entity_id, old_value, new_value)
  values (
    'AUD-' || replace(gen_random_uuid()::text, '-', ''),
    now(),
    'DDO_ALLOCATION_UPDATED',
    p_actor_id,
    v_actor.name,
    v_actor.role,
    'DdoAllocation',
    v_alloc.id,
    jsonb_build_object('allocated', v_old),
    jsonb_build_object('allocated', v_alloc.allocated, 'remaining', v_alloc.allocated - v_alloc.utilized)
  );

  return jsonb_build_object(
    'id', v_alloc.id,
    'grantId', v_alloc.grant_id,
    'ddoId', v_alloc.ddo_id,
    'allocated', v_alloc.allocated,
    'utilized', v_alloc.utilized,
    'remaining', v_alloc.allocated - v_alloc.utilized
  );
end;
$$;

create or replace function generate_rtgs_batch(p_actor_id text, p_bill_ids text[], p_bank_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor profiles%rowtype;
  v_bank corporate_bank_accounts%rowtype;
  v_bill bills%rowtype;
  v_id text;
  v_total numeric := 0;
  v_count int := 0;
  v_fy text;
  v_seq int;
  v_batch_id text;
begin
  if p_bill_ids is null or coalesce(array_length(p_bill_ids, 1), 0) = 0 then
    raise exception 'Please select at least one bill to generate an RTGS batch.';
  end if;

  select * into v_actor from profiles where id = p_actor_id;
  if not found or v_actor.role <> 'RTGS Manager' then
    raise exception 'Forbidden: Role lacks permission generate:rtgs_advice (HTTP 403)';
  end if;

  select * into v_bank from corporate_bank_accounts where id = p_bank_id and is_active = true;
  if not found then
    raise exception 'Selected corporate bank account is invalid or inactive.';
  end if;

  foreach v_id in array p_bill_ids loop
    select * into v_bill from bills where id = v_id for update;
    if not found then
      raise exception 'Atomic Batch Error: Bill % does not exist.', v_id;
    end if;
    if v_bill.status <> 'Pending RTGS' then
      raise exception 'Atomic Batch Error: Bill % is not in ''Pending RTGS'' status (current status: %). Entire batch cancelled.', v_id, v_bill.status;
    end if;
    if v_bill.rtgs_batch_id is not null then
      raise exception 'Atomic Batch Error: Bill % is already included in batch %. Entire batch cancelled.', v_id, v_bill.rtgs_batch_id;
    end if;
    v_total := v_total + v_bill.net_payable;
    v_count := v_count + 1;
  end loop;

  select financial_year into v_fy from workflow_config where id = 1;
  v_seq := next_counter('rtgs');
  v_batch_id := 'RTGS-' || split_part(v_fy, '-', 1) || '-' || lpad(v_seq::text, 4, '0');

  insert into rtgs_batches (
    id, bill_ids, bank_account_id, total_amount, beneficiary_count, generated_by, generated_by_name, generated_at
  ) values (
    v_batch_id, p_bill_ids, p_bank_id, round(v_total, 2), v_count, p_actor_id, v_actor.name, now()
  );

  foreach v_id in array p_bill_ids loop
    update bills
    set status = 'Paid', rtgs_batch_id = v_batch_id, updated_at = now()
    where id = v_id;

    insert into bill_history (id, bill_id, status, timestamp, user_id, user_name, user_role, remarks)
    values (
      'H-' || replace(gen_random_uuid()::text, '-', ''),
      v_id,
      'Paid',
      now(),
      p_actor_id,
      v_actor.name,
      v_actor.role,
      'Included in RTGS Advice ' || v_batch_id || ' drawn on ' || v_bank.bank_name || ' (' || v_bank.account_number || ').'
    );
  end loop;

  insert into audit_logs (id, timestamp, action_type, user_id, user_name, role, entity_type, entity_id, old_value, new_value)
  values (
    'AUD-' || replace(gen_random_uuid()::text, '-', ''),
    now(),
    'RTGS_BATCH_GENERATED',
    p_actor_id,
    v_actor.name,
    v_actor.role,
    'RtgsBatch',
    v_batch_id,
    null,
    jsonb_build_object(
      'batchId', v_batch_id,
      'billCount', v_count,
      'totalAmount', round(v_total, 2),
      'bankAccountId', p_bank_id
    )
  );

  return jsonb_build_object(
    'id', v_batch_id,
    'billIds', to_jsonb(p_bill_ids),
    'bankAccountId', p_bank_id,
    'totalAmount', round(v_total, 2),
    'beneficiaryCount', v_count,
    'generatedBy', p_actor_id,
    'generatedByName', v_actor.name,
    'generatedAt', now()
  );
end;
$$;

revoke all on function reserve_budget(text, numeric) from public, anon, authenticated;
revoke all on function release_budget(text, numeric) from public, anon, authenticated;
revoke all on function next_counter(text) from public, anon, authenticated;
revoke all on function reject_bill(text, text, text, text) from public, anon, authenticated;
revoke all on function update_ddo_allocation(text, text, numeric) from public, anon, authenticated;
revoke all on function generate_rtgs_batch(text, text[], text) from public, anon, authenticated;

grant execute on function reserve_budget(text, numeric) to service_role;
grant execute on function release_budget(text, numeric) to service_role;
grant execute on function next_counter(text) to service_role;
grant execute on function reject_bill(text, text, text, text) to service_role;
grant execute on function update_ddo_allocation(text, text, numeric) to service_role;
grant execute on function generate_rtgs_batch(text, text[], text) to service_role;

-- Workflow alignment for databases created before budget heads.
alter table budget_grants add column if not exists code varchar(16);
alter table budget_grants add column if not exists name varchar(255);
alter table budget_grants alter column department_id drop not null;
alter table budget_grants drop constraint if exists uq_dept_fy;
create unique index if not exists uq_budget_head_fy on budget_grants (financial_year, code) where code is not null;

alter table workflow_config add column if not exists verifier_role user_role not null default 'Finance Officer';
alter table workflow_config add column if not exists approver_role user_role not null default 'Director of Finance';

drop index if exists uq_ddos_one_per_department;

alter table bills drop constraint if exists bills_rtgs_batch_id_key;

-- Fields shown on the ProfitEazy masters in the DC Bill application walkthrough.
alter table profiles add column if not exists username varchar(64);
alter table profiles add column if not exists first_name varchar(128);
alter table profiles add column if not exists last_name varchar(128);
alter table profiles add column if not exists mobile varchar(10);

alter table vendors add column if not exists pan varchar(10);
alter table vendors add column if not exists city varchar(128);
alter table vendors add column if not exists pin_code varchar(6);
alter table vendors add column if not exists phone varchar(15);
alter table vendors add column if not exists email varchar(255);
alter table vendors add column if not exists micr varchar(9);
alter table vendors add column if not exists account_holder_name varchar(255);
alter table vendors add column if not exists old_id varchar(64);

alter table vendor_documents add column if not exists file_name varchar(255);
