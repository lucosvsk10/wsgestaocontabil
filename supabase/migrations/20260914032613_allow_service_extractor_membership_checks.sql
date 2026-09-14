-- Service-only invoker RPCs require these existing private authorization predicates.
-- No grants to public, anon or authenticated; private remains outside the REST API.
grant execute on function private.can_manage_extractor(uuid,uuid) to service_role;
grant execute on function private.is_extractor_member(uuid,uuid) to service_role;
