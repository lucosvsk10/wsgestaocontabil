
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClientDashboardLayoutProps {
  children: React.ReactNode;
}

export const ClientDashboardLayout = ({ children }: ClientDashboardLayoutProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-[#020817] text-white font-extralight">
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};
