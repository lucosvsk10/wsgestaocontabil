
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import CarouselManager from "@/components/admin/carousel/CarouselManager";
import AdminNavbar from "@/components/admin/AdminNavbar";

const AdminCarousel = () => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#020817] flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#020817]">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        <CarouselManager />
      </div>
    </div>
  );
};

export default AdminCarousel;
