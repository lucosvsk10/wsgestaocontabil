
import { Clock, User, FileText, UserPlus, Settings } from "lucide-react";

interface ActivityItem {
  id: string;
  type: 'user_added' | 'document_uploaded' | 'user_login' | 'settings_changed';
  message: string;
  timestamp: string;
  user?: string;
}

const activityIcons = {
  user_added: UserPlus,
  document_uploaded: FileText,
  user_login: User,
  settings_changed: Settings
};

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'document_uploaded',
    message: 'João Silva enviou novos documentos',
    timestamp: '2 min atrás',
    user: 'João Silva'
  },
  {
    id: '2',
    type: 'user_added',
    message: 'Maria Santos foi adicionada ao sistema',
    timestamp: '15 min atrás',
    user: 'Admin'
  },
  {
    id: '3',
    type: 'user_login',
    message: 'Carlos Oliveira fez login',
    timestamp: '1 hora atrás',
    user: 'Carlos Oliveira'
  },
  {
    id: '4',
    type: 'settings_changed',
    message: 'Configurações do sistema atualizadas',
    timestamp: '3 horas atrás',
    user: 'Admin'
  }
];

export const RecentActivity = () => {
  return (
    <div className="bg-[#0b0f1c] border border-[#efc349] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-5 h-5 text-[#efc349]" />
        <h3 className="text-[#efc349] text-lg font-museo-moderno font-semibold">
          Atividades Recentes
        </h3>
      </div>
      
      <div className="space-y-4">
        {mockActivities.map((activity) => {
          const IconComponent = activityIcons[activity.type];
          return (
            <div 
              key={activity.id} 
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#ffffff]/5 transition-all duration-300"
            >
              <div className="p-2 bg-[#efc349]/10 rounded-lg border border-[#efc349]/20">
                <IconComponent className="w-4 h-4 text-[#efc349]" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-[#ffffff] text-sm font-bebas-neue">
                  {activity.message}
                </p>
                <p className="text-[#b3b3b3] text-xs font-bebas-neue mt-1">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-[#efc349]/20">
        <button className="w-full text-[#efc349] text-sm font-bebas-neue hover:text-[#ffffff] transition-colors duration-300">
          Ver todas as atividades
        </button>
      </div>
    </div>
  );
};
