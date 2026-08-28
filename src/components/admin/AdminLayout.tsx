import React from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="pro-ui min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
