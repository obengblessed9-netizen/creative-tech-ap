
-- Revoke anon SELECT on sensitive/auth-only tables to clear GraphQL exposure warnings
-- (RLS already blocks access; this also hides them from schema introspection)
REVOKE SELECT ON public.clients FROM anon;
REVOKE SELECT ON public.sales FROM anon;
REVOKE SELECT ON public.event_attendees FROM anon;
REVOKE SELECT ON public.artist_applications FROM anon;
REVOKE SELECT ON public.artist_verifications FROM anon;
REVOKE SELECT ON public.messages FROM anon;
REVOKE SELECT ON public.art_detection_results FROM anon;
REVOKE SELECT ON public.cart_items FROM anon;
REVOKE SELECT ON public.favorites FROM anon;
REVOKE SELECT ON public.user_roles FROM anon;
REVOKE SELECT ON public.admin_audit_log FROM anon;
REVOKE SELECT ON public.live_chat_messages FROM anon;
REVOKE SELECT ON public.live_moderation_events FROM anon;
REVOKE SELECT ON public.live_reports FROM anon;
REVOKE SELECT ON public.live_stream_viewers FROM anon;
