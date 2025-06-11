import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminHeader from "./layout/AdminHeader";
import AdminSidebar from "./layout/AdminSidebar";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020817]">
      <AdminHeader />
      <AdminSidebar />

      {/* Main Content */}
      <main className="lg:pl-72">
        <div className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
