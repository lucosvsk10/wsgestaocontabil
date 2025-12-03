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
      
    </motion.div>;
};