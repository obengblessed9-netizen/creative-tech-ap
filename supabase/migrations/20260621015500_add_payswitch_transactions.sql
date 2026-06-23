CREATE TABLE public.payswitch_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  user_id UUID,
  email TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending',
  payswitch_response JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payswitch_transactions TO authenticated;
GRANT ALL ON public.payswitch_transactions TO service_role;

ALTER TABLE public.payswitch_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payswitch transactions"
ON public.payswitch_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER payswitch_transactions_updated_at
BEFORE UPDATE ON public.payswitch_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_payswitch_transactions_user ON public.payswitch_transactions(user_id);
CREATE INDEX idx_payswitch_transactions_status ON public.payswitch_transactions(status);
