-- 2026-11-12: Extend original-currency CRM manual receipts to seven ISO 4217 codes.
-- CRM Supabase project: cgencwgfupijundbhpdv ONLY.
-- Backward compatible with USD/INR payments; leaves existing rows, audit triggers,
-- historical USD-only transactions, grants, and RLS policies unchanged.
BEGIN;

ALTER TABLE public.crm_manual_payments
  DROP CONSTRAINT crm_manual_payments_native_amount_check;
ALTER TABLE public.crm_manual_payments
  ADD CONSTRAINT crm_manual_payments_native_amount_check
  CHECK (
    currency IN ('USD','INR','AED','SGD','THB','AUD','NZD')
    AND amount_received > 0
    AND (
      (currency = 'USD' AND amount_usd = amount_received)
      OR (currency <> 'USD' AND amount_usd IS NULL)
    )
  );

CREATE OR REPLACE FUNCTION public.crm_manual_payment_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.batch_students bs
    WHERE bs.student_id = new.student_id AND bs.batch_id = new.batch_id
  ) THEN
    RAISE EXCEPTION 'The selected student is not assigned to this batch.';
  END IF;
  IF auth.uid() IS NULL OR NOT public.can_manage_finance() THEN
    RAISE EXCEPTION 'Not authorized to record CRM payments.';
  END IF;
  IF new.currency IS NULL OR new.currency NOT IN ('USD','INR','AED','SGD','THB','AUD','NZD') THEN
    RAISE EXCEPTION 'Choose a supported payment currency: USD, INR, AED, SGD, THB, AUD or NZD.';
  END IF;
  -- Prior CRM clients may supply amount_usd instead of amount_received for USD.
  IF new.amount_received IS NULL AND new.currency = 'USD' THEN
    new.amount_received := new.amount_usd;
  END IF;
  IF new.amount_received IS NULL OR new.amount_received <= 0 THEN
    RAISE EXCEPTION 'A positive received amount is required.';
  END IF;
  -- No fictitious exchange rate: amount_usd is populated ONLY for real USD.
  IF new.currency = 'USD' THEN
    new.amount_usd := new.amount_received;
  ELSE
    new.amount_usd := NULL;
  END IF;
  new.created_by := auth.uid();
  new.voided_at := NULL;
  new.voided_by := NULL;
  new.void_reason := NULL;
  new.payment_mode := trim(new.payment_mode);
  new.purpose := coalesce(nullif(trim(new.purpose),''),'Course Fee');
  new.reference := nullif(trim(new.reference),'');
  new.notes := nullif(trim(new.notes),'');
  RETURN new;
END
$function$;

CREATE OR REPLACE FUNCTION public.crm_edit_manual_payment_v2(
  p_id uuid, p_amount_received numeric, p_currency text, p_payment_date date,
  p_payment_mode text, p_purpose text, p_reference text, p_notes text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_finance() THEN
    RAISE EXCEPTION 'Not authorized to edit CRM payments.' USING ERRCODE='42501';
  END IF;
  IF p_currency IS NULL OR p_currency NOT IN ('USD','INR','AED','SGD','THB','AUD','NZD') THEN
    RAISE EXCEPTION 'Choose USD, INR, AED, SGD, THB, AUD or NZD.' USING ERRCODE='22023';
  END IF;
  IF p_amount_received IS NULL OR p_amount_received<=0 OR p_amount_received>9999999999
    OR p_payment_date IS NULL OR nullif(trim(p_payment_mode),'') IS NULL THEN
    RAISE EXCEPTION 'Valid amount, date and payment method are required.' USING ERRCODE='22023';
  END IF;
  UPDATE public.crm_manual_payments
  SET currency = p_currency,
      amount_received = p_amount_received,
      amount_usd = CASE WHEN p_currency='USD' THEN p_amount_received ELSE NULL END,
      payment_date = p_payment_date,
      payment_mode = trim(p_payment_mode),
      purpose = coalesce(nullif(trim(p_purpose),''),'Course Fee'),
      reference = nullif(trim(p_reference),''),
      notes = nullif(trim(p_notes),'')
  WHERE id=p_id AND voided_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active payment entry not found.' USING ERRCODE='22023';
  END IF;
END
$function$;

-- Keep existing EXECUTE permissions unchanged; deny anonymous access explicitly.
REVOKE ALL ON FUNCTION public.crm_edit_manual_payment_v2(uuid,numeric,text,date,text,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_edit_manual_payment_v2(uuid,numeric,text,date,text,text,text,text)
  TO authenticated;

COMMIT;

-- Read-only rollout verification:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid='public.crm_manual_payments'::regclass
--   AND conname='crm_manual_payments_native_amount_check';
-- SELECT pg_get_functiondef('public.crm_edit_manual_payment_v2(uuid,numeric,text,date,text,text,text,text)'::regprocedure);
-- SELECT currency,COUNT(*) FROM public.crm_manual_payments GROUP BY currency;
