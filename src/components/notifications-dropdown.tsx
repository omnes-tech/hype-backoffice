import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useUnreadNotificationsCount,
} from "@/hooks/use-notifications";
import { clsx } from "clsx";
import type { Notification } from "@/shared/services/notifications";

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAllAsRead } =
    useMarkAllNotificationsAsRead();
  const unreadCount = useUnreadNotificationsCount();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida se ainda não estiver lida
    if (!notification.read_at) {
      markAsRead(notification.id);
    }

    // Navegar baseado no tipo de notificação
    switch (notification.type) {
      case "new_message":
        // Navegar para a campanha e abrir o chat com o influenciador
        if (notification.metadata.campaign_id && notification.metadata.influencer_id) {
          navigate({
            to: "/campaigns/$campaignId",
            params: { campaignId: notification.metadata.campaign_id },
            search: {
              tab: "management",
              openChat: String(notification.metadata.influencer_id),
            },
          });
          setIsOpen(false);
        }
        break;
      case "content_approved":
      case "content_adjustment_requested":
      case "content_submitted":
        // Navegar para a campanha e abrir a aba de aprovações de conteúdo
        if (notification.metadata.campaign_id) {
          navigate({
            to: "/campaigns/$campaignId",
            params: { campaignId: notification.metadata.campaign_id },
            search: {
              tab: "approval",
              ...(notification.metadata.content_id && { contentId: notification.metadata.content_id }),
            },
          });
          setIsOpen(false);
        }
        break;
      case "new_content_submission":
        // Para dono da campanha - navegar para aprovações de conteúdo
        if (notification.metadata.campaign_id) {
          navigate({
            to: "/campaigns/$campaignId",
            params: { campaignId: notification.metadata.campaign_id },
            search: {
              tab: "approval",
              ...(notification.metadata.content_id && { contentId: notification.metadata.content_id }),
            },
          });
          setIsOpen(false);
        }
        break;
    }
  };

  const getNotificationIcon = (type: Notification["type"]): string => {
    const icons: Record<Notification["type"], string> = {
      content_approved: "Check",
      content_adjustment_requested: "AlertCircle",
      content_submitted: "Upload",
      new_content_submission: "Bell",
      new_message: "MessageCircle",
    };
    return icons[type] || "Bell";
  };

  const getNotificationColor = (type: Notification["type"]) => {
    const colors: Record<Notification["type"], { bg: string; text: string }> = {
      content_approved: { bg: "bg-success-50", text: "text-success-900" },
      content_adjustment_requested: { bg: "bg-warning-50", text: "text-warning-900" },
      content_submitted: { bg: "bg-info-50", text: "text-info-900" },
      new_content_submission: { bg: "bg-primary-50", text: "text-primary-900" },
      new_message: { bg: "bg-blue-50", text: "text-blue-900" },
    };
    return colors[type] || { bg: "bg-neutral-50", text: "text-neutral-900" };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Agora";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min atrás`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h atrás`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} dia${days > 1 ? "s" : ""} atrás`;
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        aria-label="Notificações"
      >
        <Icon name="Bell" size={20} color="#0A0A0A" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-danger-600 text-xs font-semibold text-neutral-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-neutral-200 shadow-lg z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-950">
              Notificações
            </h3>
            {unreadCount > 0 && (
              <Badge
                text={`${unreadCount} nova${unreadCount > 1 ? "s" : ""}`}
                backgroundColor="bg-primary-50"
                textColor="text-primary-900"
              />
            )}
          </div>

          {/* Lista de notificações */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
                <p className="text-sm text-neutral-600">Carregando notificações...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Icon name="Bell" color="#A3A3A3" size={48} />
                <p className="text-sm text-neutral-600 mt-4">
                  Nenhuma notificação
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {notifications.map((notification) => {
                  const colors = getNotificationColor(notification.type);
                  const isUnread = !notification.read_at;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={clsx(
                        "w-full p-4 text-left hover:bg-neutral-50 transition-colors",
                        isUnread && "bg-primary-50/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={clsx(
                            "p-2 rounded-lg shrink-0",
                            colors.bg
                          )}
                        >
                          <Icon
                            name={getNotificationIcon(notification.type) as any}
                            size={20}
                            color={
                              colors.text === "text-success-900"
                                ? "#16a34a"
                                : colors.text === "text-warning-900"
                                ? "#ea580c"
                                : colors.text === "text-info-900"
                                ? "#0284c7"
                                : colors.text === "text-blue-900"
                                ? "#1e40af"
                                : "#9e2cfa"
                            }
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p
                              className={clsx(
                                "text-sm font-semibold",
                                isUnread ? "text-neutral-950" : "text-neutral-700"
                              )}
                            >
                              {notification.boldText || notification.title}
                            </p>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-primary-600 shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Feedback para notificações de ajuste */}
                          {notification.type === "content_adjustment_requested" &&
                            notification.metadata.feedback && (
                              <div className="bg-warning-50 rounded-lg p-2 mb-2">
                                <p className="text-xs font-medium text-warning-900 mb-1">
                                  Feedback:
                                </p>
                                <p className="text-xs text-warning-800 line-clamp-2">
                                  {notification.metadata.feedback}
                                </p>
                              </div>
                            )}

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-neutral-500">
                              {formatDate(notification.created_at)}
                            </p>
                            {notification.metadata.campaign_title && (
                              <p className="text-xs text-neutral-500 truncate ml-2">
                                {notification.metadata.campaign_title}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && unreadCount > 0 && (
            <div className="p-4 border-t border-neutral-200">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  markAllAsRead(undefined, {
                    onSuccess: () => {
                      // Toast será exibido pelo hook se necessário
                    },
                  });
                }}
                disabled={isMarkingAllAsRead}
              >
                {isMarkingAllAsRead
                  ? "Processando..."
                  : "Marcar todas como lidas"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
