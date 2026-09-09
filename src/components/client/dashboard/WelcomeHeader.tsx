import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUpRight, FileText } from "lucide-react";

export const WelcomeHeader = () => {
  const { user, userData } = useAuth();
  const displayName = String(
    userData?.name || userData?.fullname || user?.email?.split("@")[0] || "cliente"
  ).trim();

  return <motion.section
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="client-portal-welcome"
  >
    <div className="client-portal-welcome-copy">
      <span className="client-portal-overline"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Área do cliente</span>
      <h1>Olá, {displayName}.</h1>
      <p>Os documentos enviados pelo escritório ficam reunidos aqui, organizados por período.</p>
    </div>
    <div className="client-portal-welcome-note">
      <span>Atalho rápido</span>
      <strong>Consulte seus documentos</strong>
      <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
    </div>
  </motion.section>;
};
