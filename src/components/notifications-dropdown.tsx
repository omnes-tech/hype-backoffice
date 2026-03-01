import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(
    null
  );
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
        !dropdownRef.current.contains(event.target as Node) &&
        (!dropdownContentRef.current ||
          !dropdownContentRef.current.contains(event.target as Node))
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

  // Calcular posição do dropdown em relação ao ícone do sino
  useEffect(() => {
    const updatePosition = () => {
      if (!isOpen || !dropdownRef.current) return;

      const trigger = dropdownRef.current.querySelector("button");
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const right = window.innerWidth - rect.right - 8; // 8px de espaçamento
      const top = rect.bottom + 8; // 8px abaixo do sino

      setPosition({ top, right: Math.max(right, 8) });
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }

    const campaignId = notification.metadata.campaign_id;

    const goToCampaign = (id: string, tab: string, extraSearch?: Record<string, string>) => {
      navigate({
        to: "/campaigns/$campaignId",
        params: { campaignId: id },
        search: { tab, ...extraSearch },
      });
      setIsOpen(false);
    };

    switch (notification.type) {
      case "new_message":
        if (campaignId && notification.metadata.influencer_id != null) {
          goToCampaign(campaignId, "management", {
            openChat: String(notification.metadata.influencer_id),
          });
        } else if (campaignId) {
          goToCampaign(campaignId, "management");
        }
        break;
      case "influencer_approved":
        if (campaignId && notification.metadata.influencer_id != null) {
          goToCampaign(campaignId, "management", {
            openChat: String(notification.metadata.influencer_id),
          });
        } else if (campaignId) {
          goToCampaign(campaignId, "management");
        }
        break;
      case "content_approved":
      case "content_adjustment_requested":
      case "content_submitted":
      case "new_content_submission":
        if (campaignId) {
          goToCampaign(
            campaignId,
            "approval",
            notification.metadata.content_id
              ? { contentId: notification.metadata.content_id }
              : undefined
          );
        }
        break;
      default:
        if (campaignId) {
          goToCampaign(campaignId, "management");
        } else {
          setIsOpen(false);
        }
        break;
    }
  };

  const getNotificationIcon = (type: string): string => {
    const icons: Record<string, string> = {
      content_approved: "Check",
      content_adjustment_requested: "AlertCircle",
      content_submitted: "Upload",
      new_content_submission: "Bell",
      new_message: "MessageCircle",
      influencer_approved: "UserCheck",
    };
    return icons[type] ?? "Bell";
  };

  const getNotificationColor = (type: string): { bg: string; text: string } => {
    const colors: Record<string, { bg: string; text: string }> = {
      content_approved: { bg: "bg-success-50", text: "text-success-900" },
      content_adjustment_requested: { bg: "bg-warning-50", text: "text-warning-900" },
      content_submitted: { bg: "bg-info-50", text: "text-info-900" },
      new_content_submission: { bg: "bg-primary-50", text: "text-primary-900" },
      new_message: { bg: "bg-blue-50", text: "text-blue-900" },
      influencer_approved: { bg: "bg-success-50", text: "text-success-900" },
    };
    return colors[type] ?? { bg: "bg-neutral-50", text: "text-neutral-900" };
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

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={dropdownContentRef}
            className="fixed mt-2 w-96 bg-white rounded-2xl border border-neutral-200 shadow-lg z-[1000] max-h-[calc(100vh-96px)] flex flex-col overflow-hidden"
            style={{ top: position.top, right: position.right }}
          >
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
          <div className="overflow-y-auto flex-1 min-h-0">
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
                        "w-full p-4 text-left hover:bg-neutral-50 transition-colors cursor-pointer",
                        isUnread && "bg-primary-50/30"
                      )}
                      aria-label={`Ver notificação: ${notification.boldText || notification.title}`}
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
                                : colors.text === "text-neutral-900"
                                ? "#171717"
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
                          <p className="text-sm text-neutral-600 mb-2 break-words">
                            {notification.message}
                          </p>

                          {/* Feedback para notificações de ajuste */}
                          {notification.type === "content_adjustment_requested" &&
                            notification.metadata.feedback && (
                              <div className="bg-warning-50 rounded-lg p-2 mb-2">
                                <p className="text-xs font-medium text-warning-900 mb-1">
                                  Feedback:
                                </p>
                                <p className="text-xs text-warning-800 break-words">
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
          </div>,
          document.body
        )}
    </div>
  );
}
