
import { useEffect } from "react";
import { NotificationsHistoryTable } from "@/components/client/notifications/NotificationsHistoryTable";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const NotificationsHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);
  
  if (!user) return null;
  
  return (
    <div className="min-h-screen flex flex-col bg-orange-200 dark:bg-navy-dark">
      <Navbar />
      <div className="container mx-auto p-4 flex-grow py-6">
        <NotificationsHistoryTable />
      </div>
      <Footer />
    </div>
  );
};

export default NotificationsHistory;
