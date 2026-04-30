
CREATE TYPE public.payment_status AS ENUM ('pending','quoted','submitted','settled','failed');

CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  destination TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  asset_code TEXT NOT NULL DEFAULT 'XLM',
  memo TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  coinfello_payment_id TEXT,
  coinfello_quote JSONB,
  stellar_tx_hash TEXT,
  contract_tx_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own payments" ON public.payments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
