-- ============================================================
-- SAO CAFE POS — Supabase Setup (S2)
-- วิธีใช้: เปิด Supabase → เมนูซ้าย "SQL Editor" → New query
--          วางทั้งหมดนี้ → กด RUN
-- ============================================================
-- ออกแบบแบบ "1 ตารางต่อ 1 ชนิดข้อมูล" เก็บ object เป็น JSONB
-- ทำให้ sync กับแอป (ที่เก็บ JSON อยู่แล้ว) ง่ายและไม่ต้อง map คอลัมน์

-- ---------- ตารางหลัก ----------
create table if not exists orders     (id text primary key, data jsonb not null, updated_at bigint not null default 0);
create table if not exists products   (id text primary key, data jsonb not null, updated_at bigint not null default 0);
create table if not exists categories (id text primary key, data jsonb not null, updated_at bigint not null default 0);
create table if not exists ingredients(id text primary key, data jsonb not null, updated_at bigint not null default 0);
create table if not exists modifiers  (id text primary key, data jsonb not null, updated_at bigint not null default 0);
create table if not exists members    (id text primary key, data jsonb not null, updated_at bigint not null default 0);
create table if not exists promos     (id text primary key, data jsonb not null, updated_at bigint not null default 0);
create table if not exists staff      (id text primary key, data jsonb not null, updated_at bigint not null default 0);
create table if not exists tables_    (id text primary key, data jsonb not null, updated_at bigint not null default 0);
create table if not exists shifts     (id text primary key, data jsonb not null, updated_at bigint not null default 0);
create table if not exists cashlog    (id text primary key, data jsonb not null, updated_at bigint not null default 0);
-- ค่าตั้งค่าร้าน/เมตา (มีแถวเดียว id='main')
create table if not exists app_meta   (id text primary key, data jsonb not null, updated_at bigint not null default 0);

-- index ช่วย query ออเดอร์ตามสถานะ/เวลา (ดึงเร็วขึ้น)
create index if not exists idx_orders_status  on orders ((data->>'status'));
create index if not exists idx_orders_updated on orders (updated_at);

-- ---------- เปิด Realtime ----------
-- ให้ orders ส่ง event แบบ real-time (จอครัว/แคชเชียร์เห็นออเดอร์สด)
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table tables_;

-- ---------- Row Level Security ----------
-- เปิด RLS ทุกตาราง แล้วอนุญาต anon เต็มสิทธิ์ (เหมาะกับ MVP ร้านเดียว)
-- หมายเหตุ: anon key เป็น public — ระดับนี้คือ "ใครมี url+key ก็เข้าถึงได้"
--          พอจะขึ้นจริง/หลายสาขา ค่อยเพิ่ม Supabase Auth + จำกัด policy
do $$
declare t text;
begin
  foreach t in array array['orders','products','categories','ingredients','modifiers','members','promos','staff','tables_','shifts','cashlog','app_meta']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists anon_all on %I;', t);
    execute format('create policy anon_all on %I for all to anon using (true) with check (true);', t);
  end loop;
end $$;

-- เสร็จแล้ว! กลับมาบอก Claude ว่า "รัน SQL แล้ว" เพื่อต่อแอปเข้ากับ cloud
