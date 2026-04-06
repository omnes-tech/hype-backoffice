import type { WorkspacePermissions } from "@/shared/types";

/** Defaults permissivos quando a API não envia `permissions` (compatibilidade). */
const PERMISSIVE_DEFAULT: WorkspacePermissions = {
  workspace_read: true,
  workspace_settings_write: true,
  workspace_delete: true,
  workspace_photo_write: true,
  members_list: true,
  members_invite: true,
  members_remove: true,
  members_remove_only_member_role: false,
  members_role_write: true,
  campaigns_read: true,
  campaigns_write: true,
  catalog_read: true,
  catalog_write: true,
  billing_read: false,
  billing_write: false,
};

export function mergeWorkspacePermissions(
  raw?: Partial<WorkspacePermissions> | null,
): WorkspacePermissions {
  if (!raw || typeof raw !== "object") return { ...PERMISSIVE_DEFAULT };
  return { ...PERMISSIVE_DEFAULT, ...raw };
}
