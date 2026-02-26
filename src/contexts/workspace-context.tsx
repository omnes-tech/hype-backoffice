import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { Workspace } from "@/shared/types";
import { getWorkspaceId, saveWorkspaceId } from "@/lib/utils/api";
import { useWorkspaces } from "@/hooks/use-workspaces";

interface WorkspaceContextType {
  workspaces: Workspace[];
  isLoading: boolean;
  /** Só fica true depois de ter restaurado ou auto-selecionado um workspace */
  isInitialized: boolean;
  selectedWorkspace: Workspace | undefined;
  selectWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const [selectedWorkspace, setSelectedWorkspace] = useState<
    Workspace | undefined
  >(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restaurar workspace salvo ou auto-selecionar o primeiro
  useEffect(() => {
    if (isLoading) return;
    if (workspaces.length === 0) {
      setIsInitialized(true);
      return;
    }

    const savedWorkspaceId = getWorkspaceId();
    const savedWorkspace = workspaces.find((w) => w.id === savedWorkspaceId);

    if (savedWorkspace) {
      setSelectedWorkspace(savedWorkspace);
    } else {
      setSelectedWorkspace(workspaces[0]);
      saveWorkspaceId(workspaces[0].id);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    }
    setIsInitialized(true);
  }, [isLoading, workspaces, queryClient]);

  const selectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    saveWorkspaceId(workspace.id);
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["get-campaign"] });
    queryClient.invalidateQueries({ queryKey: ["get-campaign-dashboard"] });
  };

  const value = useMemo(
    () => ({
      workspaces,
      isLoading,
      isInitialized,
      selectedWorkspace,
      selectWorkspace,
    }),
    [workspaces, isLoading, isInitialized, selectedWorkspace]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
  }
  return context;
}
