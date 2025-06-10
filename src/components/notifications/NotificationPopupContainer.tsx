
import { useNotificationPopups } from '@/hooks/notifications/useNotificationPopups';
import { NotificationPopup } from './NotificationPopup';

export const NotificationPopupContainer = () => {
  const { activePopups, dismissPopup } = useNotificationPopups();

  return (
    <>
      {activePopups.map((popup, index) => (
        <div
          key={popup.id}
          style={{
            bottom: `${24 + (index * 120)}px`, // Espaçamento vertical entre pop-ups
          }}
          className="fixed right-6 z-50"
        >
          <NotificationPopup
            notification={popup}
            onClose={() => dismissPopup(popup.id)}
          />
        </div>
      ))}
    </>
  );
};
