import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { checkIsAdmin } from "@/utils/auth/userChecks";
import { supabase } from "@/integrations/supabase/client";

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRole?: string;
}

const LoadingScreen = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-muted border-b-foreground/70" />
  </div>
);

const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
  const { user, userData, isLoading } = useAuth();
  const location = useLocation();
  const admin = checkIsAdmin(userData, user?.email);
  const [isSaasMember, setIsSaasMember] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setIsSaasMember(false);
      return () => { cancelled = true; };
    }

    if (admin) {
      setIsSaasMember(false);
      return () => { cancelled = true; };
    }

    setIsSaasMember(null);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("organization_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);

      if (!cancelled) {
        setIsSaasMember(!error && Boolean(data?.length));
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, admin]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (requiredRole === "admin") {
    if (!admin) return <Navigate to="/dashboard" replace />;
    return children;
  }

  if (admin) return <Navigate to="/admin" replace />;
  if (isSaasMember === null) return <LoadingScreen />;

  if (location.pathname.startsWith("/client") && isSaasMember) {
    return <Navigate to="/app" replace />;
  }

  if (location.pathname.startsWith("/app") && !isSaasMember) {
    return <Navigate to="/client" replace />;
  }

  return children;
};

export default PrivateRoute;
