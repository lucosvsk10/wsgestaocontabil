
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { User, Building2 } from "lucide-react";

export const WelcomeHeader = () => {
  const { user, userData } = useAuth();
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between">
        <div className="bg-white dark:bg-[#0b1320] border border-[#e6e6e6] dark:border-[#efc349]/30 rounded-xl p-6 flex-1">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-[#efc349]/10 dark:bg-[#efc349]/20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-[#efc349]" />
            </div>
            <div>
              <h1 className="text-3xl font-extralight mb-2 text-[#020817] dark:text-white">
                Bem-vindo, {userData?.name || user?.email?.split('@')[0]}
              </h1>
              <p className="font-extralight text-gray-600 dark:text-gray-300">
                Gerencie seus documentos, simulações e acompanhe comunicados importantes
              </p>
            </div>
          </div>
        </div>
        
        <div className="hidden md:block ml-6">
          <div className="w-20 h-20 bg-[#efc349]/10 dark:bg-[#efc349]/20 rounded-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-[#efc349]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
