
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, User } from "lucide-react";

export const WelcomeHeader = () => {
  const { user, userData } = useAuth();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-r from-[#0b1320] to-[#1a2332] border border-[#efc349]/20 rounded-lg p-6 mb-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight text-[#efc349] mb-2">
            Bem-vindo, {userData?.name || user?.email?.split('@')[0]}
          </h1>
          <p className="text-gray-300 font-extralight">
            Gerencie seus documentos, simulações e acompanhe comunicados importantes
          </p>
        </div>
        <div className="hidden md:block">
          <div className="w-16 h-16 bg-[#efc349]/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-[#efc349]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
