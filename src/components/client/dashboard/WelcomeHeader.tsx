import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, User } from "lucide-react";
export const WelcomeHeader = () => {
  const {
    user,
    userData
  } = useAuth();
  return <motion.div initial={{
    opacity: 0,
    y: -20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.6
  }} className="bg-navydark">
      <div className="flex items-center justify-between">
        <div className="bg-white dark:bg-deepNavy/60 border border-[#e6e6e6] dark:border-gold/30 rounded-xl p-6 my-[25px] py-[25px] px-[25px]">
          <h1 className="text-3xl font-extralight mb-2 text-deepNavy-90">
            Bem-vindo, {userData?.name || user?.email?.split('@')[0]}
          </h1>
          <p className="font-extralight text-gray-400">
            Gerencie seus documentos, simulações e acompanhe comunicados importantes
          </p>
        </div>
        <div className="hidden md:block">
          <div className="w-16 h-16 bg-[#efc349]/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-[#efc349]" />
          </div>
        </div>
      </div>
    </motion.div>;
};