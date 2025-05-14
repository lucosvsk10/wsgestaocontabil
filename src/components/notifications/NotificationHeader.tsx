
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface NotificationHeaderProps {
  unreadCount: number;
  handleMarkAllAsRead: () => Promise<void>;
}

export function NotificationHeader({ unreadCount, handleMarkAllAsRead }: NotificationHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <h3 className="font-medium dark:text-white">Notificações</h3>
        <p className="text-xs text-muted-foreground dark:text-gray-300">
          {unreadCount > 0 ? `${unreadCount} não lidas` : "Todas lidas"}
        </p>
      </div>
      {unreadCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground dark:text-gray-300 hover:text-accent-foreground"
          onClick={handleMarkAllAsRead}
        >
          <Check className="mr-1 h-3 w-3" />
          Marcar todas como lidas
        </Button>
      )}
    </div>
  );
}
