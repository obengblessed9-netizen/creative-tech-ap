
-- Blog and auctions are retired features; hide from anon discovery
REVOKE SELECT ON public.blog_posts FROM anon;
REVOKE SELECT ON public.auctions FROM anon;
REVOKE SELECT ON public.bids FROM anon;
