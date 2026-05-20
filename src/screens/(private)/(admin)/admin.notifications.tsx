import { createFileRoute } from "@tanstack/react-router";

import { AdminNotificationForm } from "@/components/admin/admin-notification-form";
import { AdminNotificationList } from "@/components/admin/admin-notification-list";

export const Route = createFileRoute(
  "/(private)/(admin)/admin/notifications" as "/(private)/(admin)/admin/notifications",
)({
  component: SuperAdminNotifications,
});

function SuperAdminNotifications() {
  return (
    <div className="flex flex-col gap-8 px-6 py-6 pb-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-neutral-950">
          Notificações push, email e WhatsApp
        </h1>
        <p className="text-sm text-neutral-600">
          Crie e agende notificações para criadores do app. Selecione canais,
          monte a audiência e visualize quem será atingido antes de enviar.
        </p>
      </header>

      <AdminNotificationForm />

      <AdminNotificationList />
    </div>
  );
}
