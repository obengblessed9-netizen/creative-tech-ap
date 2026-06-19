
CREATE TABLE public.paystack_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  user_id UUID,
  email TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending',
  paystack_response JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paystack_transactions TO authenticated;
GRANT ALL ON public.paystack_transactions TO service_role;

ALTER TABLE public.paystack_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own paystack transactions"
ON public.paystack_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER paystack_transactions_updated_at
BEFORE UPDATE ON public.paystack_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_paystack_transactions_user ON public.paystack_transactions(user_id);
CREATE INDEX idx_paystack_transactions_status ON public.paystack_transactions(status);
