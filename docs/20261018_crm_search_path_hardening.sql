-- CRM Postgres function hardening (2026-10-18).
-- Fix Supabase search_path mutable warnings without changing function bodies.
begin;
alter function public.set_updated_at() set search_path = '';
alter function public.normalize_access_role(text) set search_path = '';
commit;