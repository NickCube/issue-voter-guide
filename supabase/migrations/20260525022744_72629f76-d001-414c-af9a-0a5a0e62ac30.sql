CREATE OR REPLACE FUNCTION public.exec_sql(sql text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN EXECUTE sql; END; $$;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;