-- Trigger-only function; not callable through the API
revoke execute on function public.enable_default_ai_agents() from public, anon, authenticated;
