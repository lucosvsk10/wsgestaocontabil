
import { useNotificationPopups } from '@/hooks/notifications/useNotificationPopups';
import { NotificationPopup } from './NotificationPopup';

export const NotificationPopupContainer = () => {
  const { activePopups, dismissPopup } = useNotificationPopups();

  console.log('Popups ativos:', activePopups.length);

  if (activePopups.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3">
      {activePopups.map((popup, index) => (
        <div
          key={popup.id}
          style={{
            zIndex: 60 + index, // Garantir que popups mais recentes fiquem por cima
          }}
        >
          <NotificationPopup
            notification={popup}
            onClose={() => dismissPopup(popup.id)}
          />
        </div>
      ))}
    </div>
  );
};
