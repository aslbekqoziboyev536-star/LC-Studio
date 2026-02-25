import React from 'react';
import { AppView, Role } from '../types';
import { Users, BookOpen, Bell, Smartphone, Settings, LogOut, LayoutDashboard, Hexagon, Library, Sun, Moon } from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  userRole: Role;
  onLogout: () => void;
  centerName?: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  isOpen, 
  toggleSidebar, 
  userRole,
  onLogout,
  centerName = "EduCenter",
  theme,
  toggleTheme
}) => {
  
  const allNavItems = [
    { id: AppView.DASHBOARD, label: 'Bosh Sahifa', icon: <LayoutDashboard size={20} />, allowedRoles: ['SUPER_ADMIN', 'TEACHER'] },
    { id: AppView.COURSES, label: 'Kurslar', icon: <Library size={20} />, allowedRoles: ['SUPER_ADMIN'] },
    { id: AppView.TEACHERS, label: 'O\'qituvchilar', icon: <BookOpen size={20} />, allowedRoles: ['SUPER_ADMIN'] },
    { id: AppView.STUDENTS, label: 'O\'quvchilar', icon: <Users size={20} />, allowedRoles: ['SUPER_ADMIN', 'TEACHER'] },
    { id: AppView.NOTIFICATIONS, label: 'Eslatmalar', icon: <Bell size={20} />, allowedRoles: ['SUPER_ADMIN', 'TEACHER'] },
    { id: AppView.DEVICES, label: 'Qurilmalar', icon: <Smartphone size={20} />, allowedRoles: ['SUPER_ADMIN', 'TEACHER'] },
    { id: AppView.SETTINGS, label: 'Sozlamalar', icon: <Settings size={20} />, allowedRoles: ['SUPER_ADMIN'] },
  ];

  const filteredNavItems = allNavItems.filter(item => item.allowedRoles.includes(userRole));

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-slate-900 text-white border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center h-16 px-6 border-b border-slate-800">
          <Hexagon className="text-blue-500 mr-2" size={28} />
          <span className="text-lg font-bold truncate">
            {centerName}
          </span>
        </div>

        <nav className="p-4 space-y-2">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id as AppView);
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className={`flex items-center w-full px-4 py-3 rounded-xl transition-colors ${
                currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-slate-800">
             <button
              onClick={toggleTheme}
              className="flex items-center w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors mb-2"
            >
              <span className="mr-3">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</span>
              <span className="font-medium">{theme === 'light' ? 'Qorong\'u rejim' : 'Yorug\' rejim'}</span>
            </button>
             <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <span className="mr-3"><LogOut size={20} /></span>
              <span className="font-medium">Chiqish</span>
            </button>
          </div>
        </nav>
        
        <div className="absolute bottom-0 left-0 w-full p-4">
           <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
             <h4 className="text-sm font-semibold text-slate-300 mb-1">{userRole === 'SUPER_ADMIN' ? 'Direktor' : 'O\'qituvchi'}</h4>
             <p className="text-xs text-slate-500">Tizimga kirilgan</p>
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;