
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { checkIsAdmin } from "@/utils/auth/userChecks";

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRole?: string;
}

const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
  const { user, userData, isLoading } = useAuth();
  
  const isAdmin = () => {
    return userData?.role === 'admin' || 
           user?.email === 'wsgestao@gmail.com' || 
           user?.email === 'l09022007@gmail.com';
  };

  // Enquanto está carregando, mostra um indicador de carregamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  // Se não houver usuário, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Se requerer role de admin mas o usuário não é admin, redirecionar para área do cliente
  if (requiredRole === 'admin' && !isAdmin()) {
    return <Navigate to="/client" replace />;
  }
  
  // Se o usuário é admin mas está acessando a página de cliente, redirecionar para área do admin
  if (!requiredRole && isAdmin()) {
    return <Navigate to="/admin" replace />;
  }
  
  // Se tudo estiver ok, renderiza o componente filho
  return children;
};

export default PrivateRoute;
