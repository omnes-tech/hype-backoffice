import { useState, useMemo, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import { InputDate } from "@/components/ui/input-date";
import { Checkbox } from "@/components/ui/checkbox";
import type { CampaignContent, RawCampaignContentResponse, AIEvaluation, CampaignPhase } from "@/shared/types";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { FilterPanel } from "./shared/filter-panel";
import { useCampaignContents } from "@/hooks/use-campaign-contents";
import { useApproveContent, useRejectContent } from "@/hooks/use-campaign-contents";
import { useBulkContentActions } from "@/hooks/use-bulk-content-actions";
import { getContentEvaluation } from "@/shared/services/content";
import { getUploadUrl } from "@/lib/utils/api";
import {
  getSocialNetworkDisplayLabel,
  SocialNetworkCornerBadge,
  SocialNetworkIcon,
} from "@/components/social-network-icon";
import { formatDateForInput } from "@/shared/utils/date-validations";

interface ContentApprovalTabProps {
  campaignPhases?: CampaignPhase[];
  /** Abre o modal de detalhe deste conteúdo (ex.: notificação). */
  highlightContentId?: string | null;
  onHighlightContentConsumed?: () => void;
}

export function ContentApprovalTab({
  campaignPhases = [],
  highlightContentId = null,
  onHighlightContentConsumed,
}: ContentApprovalTabProps) {
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId" });
  
  // Estados de filtros
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("pending");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");
  const [searchInfluencer, setSearchInfluencer] = useState("");
  const debouncedSearch = useDebounce(searchInfluencer, 350);
  const [filterSocialNetwork, _setFilterSocialNetwork] = useState("");
  
  // Estados de UI
  const [selectedContent, setSelectedContent] = useState<CampaignContent | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [captionFeedback, setCaptionFeedback] = useState("");
  const [newSubmissionDeadline, setNewSubmissionDeadline] = useState("");
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"approve" | "reject" | null>(null);
  const [bulkRejectionFeedback, setBulkRejectionFeedback] = useState("");
  const [bulkCaptionFeedback, setBulkCaptionFeedback] = useState("");
  const [bulkNewSubmissionDeadline, setBulkNewSubmissionDeadline] = useState("");
  const [aiEvaluation, setAiEvaluation] = useState<AIEvaluation | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewModalUrls, setPreviewModalUrls] = useState<string[]>([]);
  const [previewModalCurrentIndex, setPreviewModalCurrentIndex] = useState(0);
  const [previewModalContentType, setPreviewModalContentType] = useState<string | undefined>();

  // Buscar conteúdos com filtros dinâmicos
  // Nota: A API pode retornar conteúdos com status 'awaiting_approval', então tratamos no frontend
  const filters = useMemo(() => {
    const filter: { status?: string; phase_id?: string } = {};
    // Se o filtro for "pending", não enviamos filtro de status para a API
    // e filtramos no frontend para incluir tanto "pending" quanto "awaiting_approval"
    if (selectedStatusFilter !== "all" && selectedStatusFilter !== "pending") {
      filter.status = selectedStatusFilter;
    }
    if (selectedPhaseFilter !== "all") {
      filter.phase_id = selectedPhaseFilter;
    }
    return filter;
  }, [selectedStatusFilter, selectedPhaseFilter]);

  const {
    data: contents = [],
    isLoading: isLoadingContents,
    isFetching: isContentsFetching,
    isFetched: isContentsFetched,
    refetch: refetchContents,
  } = useCampaignContents(campaignId || "", filters);

  // Normalizar conteúdos (garantir compatibilidade com diferentes formatos da API)
  const normalizedContents = useMemo(() => {
    return contents.map((content: RawCampaignContentResponse) => ({
      id: content.id,
      campaign_id: content.campaign_id,
      influencer_id: content.influencer_id || content.influencerId,
      influencerId: content.influencerId || content.influencer_id,
      influencer_name: content.influencer_name || content.influencerName,
      influencerName: content.influencerName || content.influencer_name,
      influencer_avatar: content.influencer_avatar || content.influencerAvatar,
      influencerAvatar: content.influencerAvatar || content.influencer_avatar,
      // Suporte ao novo formato: social_network como objeto ou string
      social_network: content.social_network_type || (typeof content.social_network === "object" && content.social_network !== null ? content.social_network.type : content.social_network) || content.socialNetwork || "",
      socialNetwork: content.social_network_type || (typeof content.social_network === "object" && content.social_network !== null ? content.social_network.type : undefined) || content.socialNetwork || content.social_network || "",
      social_network_type: content.social_network_type || (typeof content.social_network === "object" && content.social_network !== null ? content.social_network.type : content.social_network) || content.socialNetwork || "",
      social_network_obj: content.social_network && typeof content.social_network === 'object' ? content.social_network : undefined,
      content_type: content.content_type || content.contentType,
      contentType: content.contentType || content.content_type,
      // Novo campo: content_format
      content_format: content.content_format || undefined,
      // Tipo específico do formato deste conteúdo
      content_format_type: content.content_format_type || content.metadata?.content_format_type || null,
      preview_url: content.preview_url || content.previewUrl,
      previewUrl: content.previewUrl || content.preview_url,
      preview_urls: content.preview_urls || content.previewUrls || (content.preview_url ? [content.preview_url] : content.previewUrl ? [content.previewUrl] : []),
      previewUrls: content.previewUrls || content.preview_urls || (content.preview_url ? [content.preview_url] : content.previewUrl ? [content.previewUrl] : []),
      post_url: content.post_url || content.postUrl,
      postUrl: content.postUrl || content.post_url,
      status: content.status,
      // Novo campo: phase como objeto completo
      phase: content.phase || undefined,
      phase_id: content.phase_id || content.phase?.id || content.phaseId || null,
      submitted_at: content.submitted_at || content.submittedAt,
      submittedAt: content.submittedAt || content.submitted_at,
      published_at: content.published_at || content.publishedAt,
      publishedAt: content.publishedAt || content.published_at,
      feedback: content.feedback,
      caption: content.caption,
      // Novo campo: caption_feedback
      caption_feedback: content.caption_feedback || null,
      // Novo campo: metadata
      metadata: content.metadata || null,
      ai_evaluation: content.ai_evaluation,
    })) as CampaignContent[];
  }, [contents]);

  const highlightHandledRef = useRef<string | null>(null);

  useEffect(() => {
    highlightHandledRef.current = null;
  }, [highlightContentId]);

  useEffect(() => {
    if (!highlightContentId) return;
    if (highlightHandledRef.current === highlightContentId) return;

    if (selectedStatusFilter !== "all" || selectedPhaseFilter !== "all") {
      setSelectedStatusFilter("all");
      setSelectedPhaseFilter("all");
      return;
    }

    if (isContentsFetching || !isContentsFetched) return;

    const id = String(highlightContentId);
    const c = normalizedContents.find((x) => String(x.id) === id);
    if (c) {
      setSelectedContent(c);
      setIsDetailModalOpen(true);
    }
    highlightHandledRef.current = highlightContentId;
    onHighlightContentConsumed?.();
  }, [
    highlightContentId,
    selectedStatusFilter,
    selectedPhaseFilter,
    normalizedContents,
    isContentsFetching,
    isContentsFetched,
    onHighlightContentConsumed,
  ]);

  // Filtrar conteúdos baseado nos filtros selecionados
  const filteredContents = useMemo(() => {
    let filtered = normalizedContents;

    // Filtro por fase já é aplicado na query, mas garantimos aqui também
    if (selectedPhaseFilter !== "all") {
      filtered = filtered.filter((content) => content.phase_id === selectedPhaseFilter);
    }

    // Filtro por status (tratar awaiting_approval como pending, content_approved como approved, Reprovados = correction + rejected)
    if (selectedStatusFilter !== "all") {
      if (selectedStatusFilter === "pending") {
        filtered = filtered.filter((content) =>
          content.status === "pending" || content.status === "awaiting_approval"
        );
      } else if (selectedStatusFilter === "approved") {
        filtered = filtered.filter((content) =>
          content.status === "approved" || content.status === "content_approved"
        );
      } else if (selectedStatusFilter === "correction") {
        filtered = filtered.filter(
          (content) => content.status === "correction" || content.status === "rejected"
        );
      } else {
        filtered = filtered.filter((content) => content.status === selectedStatusFilter);
      }
    }

    // Filtro por busca de influenciador
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((content) =>
        content.influencerName.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por rede social
    if (filterSocialNetwork) {
      filtered = filtered.filter((content) => {
        const network = content.socialNetwork || content.social_network;
        const contentNetwork = typeof network === 'string' ? network.toLowerCase() : "";
        return contentNetwork === filterSocialNetwork.toLowerCase();
      });
    }

    return filtered;
  }, [normalizedContents, selectedPhaseFilter, selectedStatusFilter, debouncedSearch, filterSocialNetwork]);

  // Seleção múltipla
  const filteredContentIds = useMemo(() => filteredContents.map((c) => c.id), [filteredContents]);
  const {
    selected: selectedContents,
    toggle: handleSelectContent,
    toggleAll: handleSelectAll,
    clear: clearSelectedContents,
    isAllSelected: isAllContentsSelected,
  } = useBulkSelection(filteredContentIds);

  // Hooks para mutations
  const { mutate: approveContent, isPending: isApproving } = useApproveContent(campaignId || "");
  const { mutate: rejectContent, isPending: isRejecting } = useRejectContent(campaignId || "");
  const {
    approve: bulkApprove,
    reject: bulkReject,
    isApproving: isBulkApproving,
    isRejecting: isBulkRejecting,
  } = useBulkContentActions({ campaignId: campaignId || "" });

  // Buscar avaliação da IA quando modal de detalhes abrir
  const getAIEvaluation = async (contentId: string) => {
    if (!campaignId) return;
    
    setIsLoadingEvaluation(true);
    try {
      const evaluation = await getContentEvaluation(campaignId, contentId);
      if (evaluation) {
        // Transformar resposta da API para formato AIEvaluation
        setAiEvaluation({
          score: evaluation.score,
          feedback: evaluation.recommendations?.join(". ") || "Avaliação disponível",
          compliance: {
            mentionsBrand: evaluation.criteria?.relevance ? evaluation.criteria.relevance >= 7 : false,
            usesHashtag: evaluation.criteria?.relevance ? evaluation.criteria.relevance >= 7 : false,
            showsProduct: evaluation.criteria?.quality ? evaluation.criteria.quality >= 7 : false,
            followsGuidelines: evaluation.criteria?.engagement ? evaluation.criteria.engagement >= 7 : false,
          },
          suggestions: evaluation.recommendations || [],
        });
      } else {
        setAiEvaluation(null);
      }
    } catch {
      setAiEvaluation(null);
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  // Função para abrir modal de detalhes e buscar avaliação da IA
  const handleOpenDetailModal = (content: CampaignContent) => {
    setSelectedContent(content);
    setIsDetailModalOpen(true);
    getAIEvaluation(content.id);
  };

  const phaseOptions = [
    { value: "all", label: "Todas as fases" },
    ...campaignPhases.map((phase, index) => ({
      value: phase.id,
      label: `Fase ${index + 1}`,
    })),
  ];


  const handleBulkApprove = () => {
    const contentIds = Array.from(selectedContents);
    if (contentIds.length === 0) {
      toast.error("Selecione pelo menos um conteúdo");
      return;
    }

    bulkApprove(
      {
        contentIds,
        data: {
          ...(bulkRejectionFeedback.trim() && { feedback: bulkRejectionFeedback }),
          ...(bulkCaptionFeedback.trim() && { caption_feedback: bulkCaptionFeedback }),
          ...(bulkNewSubmissionDeadline && {
            new_submission_deadline: bulkNewSubmissionDeadline, // Formato YYYY-MM-DD
          }),
        },
      },
      {
        onSuccess: () => {
          clearSelectedContents();
          setBulkRejectionFeedback("");
          setBulkCaptionFeedback("");
          setBulkNewSubmissionDeadline("");
          setIsBulkActionModalOpen(false);
          setBulkActionType(null);
          refetchContents();
        },
      }
    );
  };

  const handleBulkReject = () => {
    if (!bulkRejectionFeedback.trim()) {
      toast.error("Feedback é obrigatório");
      return;
    }

    const contentIds = Array.from(selectedContents);
    if (contentIds.length === 0) {
      toast.error("Selecione pelo menos um conteúdo");
      return;
    }

    bulkReject(
      {
        contentIds,
        feedback: bulkRejectionFeedback,
        ...(bulkCaptionFeedback.trim() && { caption_feedback: bulkCaptionFeedback }),
        ...(bulkNewSubmissionDeadline && {
          new_submission_deadline: bulkNewSubmissionDeadline, // Formato YYYY-MM-DD
        }),
      },
      {
        onSuccess: () => {
          clearSelectedContents();
          setBulkRejectionFeedback("");
          setBulkCaptionFeedback("");
          setBulkNewSubmissionDeadline("");
          setIsBulkActionModalOpen(false);
          setBulkActionType(null);
          refetchContents();
        },
      }
    );
  };

  const handleApprove = (content: CampaignContent) => {
    approveContent(
      { 
        content_id: content.id,
        ...(rejectionFeedback.trim() && { feedback: rejectionFeedback }),
        ...(captionFeedback.trim() && { caption_feedback: captionFeedback }),
        ...(newSubmissionDeadline && {
          new_submission_deadline: new Date(newSubmissionDeadline).toISOString(),
        }),
      },
      {
        onSuccess: () => {
          toast.success("Conteúdo aprovado com sucesso!");
          setSelectedContent(null);
          setRejectionFeedback("");
          setCaptionFeedback("");
          setNewSubmissionDeadline("");
          refetchContents();
        },
        onError: (error: Error) => {
          toast.error(error?.message || "Erro ao aprovar conteúdo");
        },
      }
    );
  };

  const handleReject = (content: CampaignContent) => {
    setSelectedContent(content);
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = () => {
    if (selectedContent && rejectionFeedback.trim()) {
      rejectContent(
        {
          content_id: selectedContent.id,
          feedback: rejectionFeedback,
          ...(captionFeedback.trim() && { caption_feedback: captionFeedback }),
          ...(newSubmissionDeadline && {
            new_submission_deadline: newSubmissionDeadline, // Formato YYYY-MM-DD
          }),
        },
        {
          onSuccess: () => {
            toast.success("Conteúdo reprovado");
            setIsRejectModalOpen(false);
            setSelectedContent(null);
            setRejectionFeedback("");
            setCaptionFeedback("");
            setNewSubmissionDeadline("");
            refetchContents();
          },
          onError: (error: Error) => {
            toast.error(error?.message || "Erro ao reprovar conteúdo");
          },
        }
      );
    }
  };

  // Função para detectar se é vídeo ou imagem baseado na URL
  // Prioriza extensões de arquivo (mais confiável) e analisa cada URL individualmente
  const isVideoFile = (url: string, contentType?: string): boolean => {
    if (!url) return false;
    
    const urlLower = url.toLowerCase();
    const urlPath = urlLower.split('?')[0]; // Remover query params
    
    // PRIMEIRO: Verificar extensões de imagem (mais específico e confiável)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.jfif'];
    // Verificar se termina com extensão de imagem (mais confiável)
    if (imageExtensions.some(ext => urlPath.endsWith(ext))) {
      return false; // É imagem, não vídeo
    }
    
    // SEGUNDO: Verificar extensões de vídeo (mais específico e confiável)
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.flv', '.mpg', '.mpeg'];
    // Verificar se termina com extensão de vídeo (mais confiável)
    if (videoExtensions.some(ext => urlPath.endsWith(ext))) {
      return true; // É vídeo
    }
    
    // TERCEIRO: Verificar tipo MIME na URL (se houver)
    // Algumas URLs podem ter tipo MIME no path ou query params
    if (urlLower.includes('image/') || urlLower.includes('image%2f')) {
      return false;
    }
    if (urlLower.includes('video/') || urlLower.includes('video%2f')) {
      return true;
    }
    
    // QUARTO: Verificar tipo de conteúdo (menos confiável, pois é geral)
    // Só usar se não tiver extensão clara
    if (contentType) {
      const contentTypeLower = contentType.toLowerCase();
      // Tipos que geralmente são vídeos
      if (contentTypeLower.includes('video') || 
          contentTypeLower.includes('reels') || 
          contentTypeLower.includes('reel') ||
          contentTypeLower.includes('shorts') ||
          contentTypeLower.includes('short')) {
        // Mas só confiar se não tiver extensão de imagem
        if (!imageExtensions.some(ext => urlPath.includes(ext))) {
          return true;
        }
      }
      
      // Tipos que geralmente são imagens
      if (contentTypeLower.includes('image') || 
          contentTypeLower.includes('photo') ||
          contentTypeLower.includes('picture') ||
          contentTypeLower === 'post' ||
          contentTypeLower === 'story' ||
          contentTypeLower === 'stories') {
        return false;
      }
    }
    
    // ÚLTIMO RECURSO: Verificar palavras-chave na URL (menos confiável)
    // Só usar se não tiver extensão clara
    const hasImageExtension = imageExtensions.some(ext => urlPath.includes(ext));
    const hasVideoExtension = videoExtensions.some(ext => urlPath.includes(ext));
    
    if (hasImageExtension && !hasVideoExtension) {
      return false;
    }
    if (hasVideoExtension && !hasImageExtension) {
      return true;
    }
    
    // Se não tiver extensão clara, verificar palavras-chave muito específicas
    // Mas ser conservador - só marcar como vídeo se for muito claro
    const strongVideoKeywords = ['/video/', '/videos/', '.mp4', '.mov', '.webm'];
    if (strongVideoKeywords.some(keyword => urlPath.includes(keyword))) {
      return true;
    }
    
    // Por padrão, assumir que é imagem (mais comum em redes sociais)
    // URLs sem extensão geralmente são imagens servidas por CDNs
    return false;
  };

  // Componente para renderizar preview individual (imagem ou vídeo)
  const renderSinglePreview = (previewUrl: string, contentType?: string) => {
    const isVideo = isVideoFile(previewUrl, contentType);
    
    if (isVideo) {
      return (
        <video
          src={previewUrl}
          className="w-full h-full object-contain"
          controls
          playsInline
          preload="metadata"
          onError={(e) => {
            // Se o vídeo falhar, mostrar mensagem de erro
            const target = e.target as HTMLVideoElement;
            const errorDiv = document.createElement('div');
            errorDiv.className = 'w-full h-full flex items-center justify-center bg-neutral-200 text-neutral-600 text-sm';
            errorDiv.textContent = 'Erro ao carregar vídeo';
            target.parentNode?.replaceChild(errorDiv, target);
          }}
        >
          Seu navegador não suporta a tag de vídeo.
        </video>
      );
    }

    // Por padrão, renderizar como imagem
    return (
      <img
        src={previewUrl}
        alt="Preview"
        className="w-full h-full object-contain"
        onError={(e) => {
          // Se a imagem falhar, mostrar placeholder
          const target = e.target as HTMLImageElement;
          const errorDiv = document.createElement('div');
          errorDiv.className = 'w-full h-full flex items-center justify-center bg-neutral-200';
          const icon = document.createElement('div');
          icon.className = 'text-neutral-400';
          icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
          errorDiv.appendChild(icon);
          target.parentNode?.replaceChild(errorDiv, target);
        }}
      />
    );
  };

  // Função para abrir modal de preview
  const openPreviewModal = (previewUrl: string | null | undefined, previewUrls?: string[], contentType?: string) => {
    const urls = previewUrls && previewUrls.length > 0 
      ? previewUrls 
      : previewUrl 
        ? [previewUrl] 
        : [];
    
    if (urls.length === 0) return;
    
    setPreviewModalUrls(urls);
    setPreviewModalCurrentIndex(0);
    setPreviewModalContentType(contentType);
    setIsPreviewModalOpen(true);
  };

  // Componente para renderizar grid de thumbnails
  const renderPreviewGrid = (
    previewUrl: string | null | undefined,
    previewUrls?: string[],
    contentType?: string
  ) => {
    // Se houver array de URLs, usar o array; caso contrário, usar a URL única
    const urls = previewUrls && previewUrls.length > 0 
      ? previewUrls 
      : previewUrl 
        ? [previewUrl] 
        : [];

    if (urls.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-neutral-200 rounded-lg">
          <Icon name="Image" color="#A3A3A3" size={32} />
        </div>
      );
    }

    // Se houver apenas uma URL, mostrar thumbnail clicável
    if (urls.length === 1) {
      return (
        <div 
          className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity rounded-lg overflow-hidden bg-neutral-200"
          onClick={() => openPreviewModal(previewUrl, previewUrls, contentType)}
        >
          {renderSinglePreview(urls[0], contentType)}
        </div>
      );
    }

    // Se houver múltiplas URLs, mostrar grid de thumbnails compacto
    // Máximo de 4 thumbnails visíveis, resto fica oculto com indicador
    const maxVisible = 4;
    const visibleUrls = urls.slice(0, maxVisible);
    const remainingCount = urls.length - maxVisible;

    // Determinar layout do grid baseado no número de imagens
    const getGridClass = () => {
      if (urls.length === 2) return "grid-cols-2";
      if (urls.length === 3) return "grid-cols-2";
      return "grid-cols-2"; // 4 ou mais
    };

    return (
      <div 
        className="relative w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => openPreviewModal(previewUrl, previewUrls, contentType)}
      >
        <div className={`grid ${getGridClass()} gap-0.5 h-full`}>
          {visibleUrls.map((url, index) => (
            <div key={index} className="relative rounded overflow-hidden bg-neutral-200 aspect-square">
              {renderSinglePreview(url, contentType)}
              {index === maxVisible - 1 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">+{remainingCount}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {urls.length > 1 && (
          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
            {urls.length}
          </div>
        )}
      </div>
    );
  };

  const canSelectMultiple = selectedStatusFilter === "pending" || selectedStatusFilter === "all";
  const listTitleByStatus: Record<string, string> = {
    pending: "Conteúdos pendentes",
    approved: "Conteúdos aprovados",
    correction: "Conteúdos reprovados",
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold text-neutral-950">
            Aprovações de conteúdo
          </h2>
          <p className="text-base text-[#4d4d4d] leading-5">
            Revise as mídias e legendas gravadas antes da publicação nas redes
            sociais.
          </p>
        </div>

        <FilterPanel
          search={searchInfluencer}
          onSearchChange={setSearchInfluencer}
          phaseOptions={phaseOptions}
          selectedPhase={selectedPhaseFilter}
          onPhaseChange={setSelectedPhaseFilter}
        />

        <div className="bg-white rounded-[12px] p-5 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-neutral-950">
              {listTitleByStatus[selectedStatusFilter] || "Conteúdos pendentes"} (
              {filteredContents.length})
            </h3>
            <div className="flex gap-1">
              {(["pending", "approved", "correction"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedStatusFilter(key)}
                  className={`h-11 px-4 py-2.5 rounded-[24px] text-base font-semibold transition-colors ${
                    selectedStatusFilter === key
                      ? "bg-primary-600 text-white"
                      : "border border-[#e5e5e5] text-[#737373] hover:bg-neutral-50"
                  }`}
                >
                  {key === "pending" ? "Pendentes" : key === "approved" ? "Aprovados" : "Reprovados"}
                </button>
              ))}
            </div>
          </div>

          {canSelectMultiple && filteredContents.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1">
                <Checkbox
                  checked={isAllContentsSelected}
                  onCheckedChange={handleSelectAll}
                  className="rounded-[4px] border-[#c8c8c8] bg-[#f5f5f5] size-6"
                />
                <label className="text-base text-neutral-950 cursor-pointer">
                  Selecionar todos ({filteredContents.length})
                </label>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedContents.size > 0) {
                    setBulkActionType("approve");
                    setIsBulkActionModalOpen(true);
                  } else {
                    toast.error("Selecione pelo menos um conteúdo");
                  }
                }}
                className="h-11 px-6 rounded-[24px] border-[#e5e5e5] text-base font-semibold text-neutral-950"
              >
                Múltiplas aprovações
              </Button>
            </div>
          )}

          {isLoadingContents ? (
            <div className="text-center py-12">
              <p className="text-neutral-500">Carregando conteúdos...</p>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="FileCheck" color="#A3A3A3" size={48} />
              <p className="text-neutral-600 mt-4">
                Nenhum conteúdo encontrado com os filtros selecionados
              </p>
            </div>
          ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-6">
                {filteredContents.map((content) => {
                  const resolvedSocialNetwork =
                    content.social_network ||
                    content.social_network_type ||
                    content.socialNetwork ||
                    content.social_network_obj?.type ||
                    content.content_format?.social_network ||
                    "";

                  return (
                    <div
                      key={content.id}
                      className={`relative bg-[#f5f5f5] rounded-[12px] p-3 min-w-[260px] w-full max-w-[269px] flex flex-col gap-5 border transition-colors ${
                        selectedContents.has(content.id)
                          ? "ring-2 ring-primary-600 ring-offset-2"
                          : "border-transparent"
                      }`}
                    >
                      {canSelectMultiple && (
                        <div className="absolute top-3 left-3 z-10">
                          <Checkbox
                            checked={selectedContents.has(content.id)}
                            onCheckedChange={() => handleSelectContent(content.id)}
                            className="rounded-[4px] border-[#c8c8c8] bg-white size-6"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pl-8">
                        <div className="relative w-[60px] h-[60px] rounded-[16px] overflow-visible shrink-0 flex items-center justify-center bg-neutral-200">
                          <div className="size-full overflow-hidden rounded-[16px] flex items-center justify-center">
                            <Avatar
                              src={getUploadUrl(content.influencerAvatar)}
                              alt={content.influencerName}
                              size="2xl"
                            />
                          </div>
                          <SocialNetworkCornerBadge
                            networkType={resolvedSocialNetwork}
                            title={getSocialNetworkDisplayLabel(resolvedSocialNetwork)}
                          />
                        </div>
                        {(content.phase || content.phase_id) && (
                          <span className="bg-[#c4e3ff] px-4 py-2 rounded-[32px] text-base text-neutral-950">
                            Fase{" "}
                            {content.phase?.order ??
                              ((campaignPhases.findIndex((p) => p.id === content.phase_id) + 1) || "?")}
                            {campaignPhases.length > 0 ? `/${campaignPhases.length}` : ""}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        <p className="text-lg font-medium text-neutral-950 truncate">
                          {content.influencerName}
                        </p>
                        <p className="text-sm text-[#4d4d4d] truncate">
                          @{(content.influencerName || "").replace(/\s+/g, "_") || "username"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-[#4d4d4d] leading-5 truncate">
                          {content.caption || "Sem legenda"}
                        </p>
                        <div
                          className="h-[137px] rounded-lg overflow-hidden bg-neutral-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleOpenDetailModal(content)}
                        >
                          {renderPreviewGrid(content.previewUrl, content.previewUrls, content.contentType)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-2.5 items-center min-w-0">
                          {resolvedSocialNetwork ? (
                            <SocialNetworkIcon
                              networkType={resolvedSocialNetwork}
                              color="#737373"
                              size={20}
                            />
                          ) : null}
                        </div>
                        <span className="bg-[#e2e2e2] px-4 py-2 rounded-[32px] text-base text-neutral-950 shrink-0">
                          {content.content_format_type || content.contentType || "Conteúdo"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 mt-auto">
                        {(content.status === "pending" ||
                          content.status === "awaiting_approval") && (
                          <div className="flex gap-1">
                            <Button
                              onClick={() => handleApprove(content)}
                              disabled={isApproving || isRejecting}
                              className="flex-1 h-11 rounded-[24px] bg-primary-600 text-white border-0 font-semibold hover:bg-primary-700"
                            >
                              <div className="flex items-center gap-1">
                                <Icon name="Check" color="#FAFAFA" size={24} />
                                <span>Aprovar</span>
                              </div>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleOpenDetailModal(content)}
                              className="flex-1 h-11 rounded-[24px] border-[#e5e5e5] text-[#585858] font-semibold"
                            >
                              Avaliar
                            </Button>
                          </div>
                        )}
                        {(content.status === "approved" ||
                          content.status === "content_approved") && (
                          <div className="flex items-center gap-1 h-11 px-4 rounded-[24px] border border-[#e5e5e5] bg-white text-[#585858] font-semibold text-base">
                            <Icon name="Check" color="#585858" size={24} />
                            <span>Aprovado</span>
                          </div>
                        )}
                        {(content.status === "correction" ||
                          content.status === "rejected") && (
                          <Button
                            variant="outline"
                            onClick={() => handleOpenDetailModal(content)}
                            className="h-11 rounded-[24px] border-[#e5e5e5] text-[#585858] font-semibold"
                          >
                            Visualizar feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
          )}
        </div>
      </div>

      {/* Modal de reprovação */}
      {selectedContent && isRejectModalOpen && (
        <Modal
          title="Reprovar conteúdo"
          onClose={() => {
            setIsRejectModalOpen(false);
            setSelectedContent(null);
            setRejectionFeedback("");
            setCaptionFeedback("");
            setNewSubmissionDeadline("");
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={getUploadUrl(selectedContent.influencerAvatar)}
                alt={selectedContent.influencerName}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedContent.influencerName}
                </h3>
                <p className="text-neutral-600">
                  {selectedContent.socialNetwork} • {selectedContent.contentType}
                </p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden bg-neutral-200 h-32">
              {renderPreviewGrid(selectedContent.previewUrl, selectedContent.previewUrls, selectedContent.contentType)}
            </div>

            {selectedContent.caption && (
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                <p className="text-xs font-medium text-neutral-700 mb-2">
                  Legenda do conteúdo:
                </p>
                <p className="text-sm text-neutral-900 whitespace-pre-wrap break-words">
                  {selectedContent.caption}
                </p>
              </div>
            )}

            <div className="bg-danger-50 rounded-2xl p-4">
              <p className="text-sm text-danger-900">
                O feedback é obrigatório ao reprovar um conteúdo. Ele será enviado ao
                influenciador para que possa fazer as correções necessárias.
              </p>
            </div>

            <Textarea
              label="Feedback sobre o conteúdo"
              placeholder="Explique o que precisa ser ajustado no conteúdo..."
              value={rejectionFeedback}
              onChange={(e) => setRejectionFeedback(e.target.value)}
              error={
                !rejectionFeedback.trim() ? "Este campo é obrigatório" : undefined
              }
            />

            <Textarea
              label="Feedback sobre a legenda"
              placeholder="Explique o que precisa ser ajustado na legenda (opcional)..."
              value={captionFeedback}
              onChange={(e) => setCaptionFeedback(e.target.value)}
            />

            <InputDate
              label="Nova data limite para reenvio (opcional)"
              value={newSubmissionDeadline}
              onChange={setNewSubmissionDeadline}
              placeholder="Selecione uma data limite para o reenvio"
              min={formatDateForInput(new Date())}
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedContent(null);
                  setRejectionFeedback("");
                  setCaptionFeedback("");
                  setNewSubmissionDeadline("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmRejection}
                disabled={!rejectionFeedback.trim() || isRejecting}
                className="flex-1"
              >
                {isRejecting ? "Processando..." : "Confirmar reprovação"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de detalhes com avaliação IA completa */}
      {selectedContent && isDetailModalOpen && (
        <Modal
          title="Avaliação completa do conteúdo"
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedContent(null);
            setAiEvaluation(null);
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={getUploadUrl(selectedContent.influencerAvatar)}
                alt={selectedContent.influencerName}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedContent.influencerName}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-neutral-600">
                    {selectedContent.socialNetwork} • {selectedContent.contentType}
                  </p>
                  {selectedContent.content_format_type && (
                    <Badge
                      text={selectedContent.content_format_type}
                      backgroundColor="bg-primary-200"
                      textColor="text-primary-700"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Informações da fase */}
            {selectedContent.phase && (
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                <p className="text-sm font-medium text-neutral-950 mb-2">
                  Fase {selectedContent.phase.order}: {selectedContent.phase.objective}
                </p>
                {selectedContent.phase.publish_date && (
                  <p className="text-xs text-neutral-600">
                    Data de publicação: {new Date(selectedContent.phase.publish_date).toLocaleDateString("pt-BR")}
                    {selectedContent.phase.publish_time && ` às ${selectedContent.phase.publish_time.slice(0, 5)}`}
                  </p>
                )}
                {selectedContent.phase.content_submission_deadline && (
                  <p className="text-xs text-neutral-600 mt-1">
                    Prazo para envio: {new Date(selectedContent.phase.content_submission_deadline).toLocaleDateString("pt-BR")}
                  </p>
                )}
                {selectedContent.phase.correction_submission_deadline && (
                  <p className="text-xs text-neutral-600 mt-1">
                    Prazo para correção: {new Date(selectedContent.phase.correction_submission_deadline).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            )}

            {/* Informações de rede social e formato */}
            {(selectedContent.social_network_obj || selectedContent.content_format) && (
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                {selectedContent.social_network_obj && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-neutral-700 mb-1">Rede social:</p>
                    <p className="text-sm text-neutral-950">
                      {selectedContent.social_network_obj.name}
                      {selectedContent.social_network_obj.username && ` (@${selectedContent.social_network_obj.username})`}
                    </p>
                  </div>
                )}
                {selectedContent.content_format && (
                  <div>
                    <p className="text-xs font-medium text-neutral-700 mb-1">Formatos disponíveis:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedContent.content_format.formats.map((format: any, idx: number) => (
                        <li key={idx} className="text-sm text-neutral-600">
                          {format.type} - {format.quantity}x
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl overflow-hidden bg-neutral-200 h-32">
              {renderPreviewGrid(selectedContent.previewUrl, selectedContent.previewUrls, selectedContent.contentType)}
            </div>

            {/* Links do conteúdo */}
            {(selectedContent.postUrl || selectedContent.previewUrls?.length) && (
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                <p className="text-xs font-medium text-neutral-700 mb-2">Links:</p>
                <div className="flex flex-col gap-2">
                  {selectedContent.postUrl && (
                    <a
                      href={selectedContent.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-2"
                    >
                      <Icon name="ExternalLink" color="#2563eb" size={16} />
                      <span>Ver post/publicação</span>
                    </a>
                  )}
                  {selectedContent.previewUrls && selectedContent.previewUrls.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {selectedContent.previewUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-2"
                        >
                          <Icon name="Image" color="#2563eb" size={16} />
                          <span>Preview {idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedContent.caption && (
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                <p className="text-xs font-medium text-neutral-700 mb-2">
                  Legenda do conteúdo:
                </p>
                <p className="text-sm text-neutral-900 whitespace-pre-wrap break-words">
                  {selectedContent.caption}
                </p>
                {selectedContent.caption_feedback && (
                  <div className="mt-3 pt-3 border-t border-neutral-200">
                    <p className="text-xs font-medium text-warning-700 mb-1">
                      Feedback sobre a legenda:
                    </p>
                    <p className="text-xs text-warning-900">
                      {selectedContent.caption_feedback}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-neutral-950 mb-3">
                Avaliação da IA
              </h4>
              {isLoadingEvaluation ? (
                <div className="bg-neutral-50 rounded-2xl p-4 text-center">
                  <p className="text-neutral-600">Carregando avaliação...</p>
                </div>
              ) : aiEvaluation ? (
                <div className="bg-primary-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon name="Sparkles" color="#9e2cfa" size={20} />
                      <h4 className="font-semibold text-primary-900">
                        Avaliação da IA
                      </h4>
                    </div>
                    <Badge
                      text={`${aiEvaluation.score}%`}
                      backgroundColor="bg-primary-600"
                      textColor="text-neutral-50"
                    />
                  </div>
                  <p className="text-sm text-primary-900 mb-4">{aiEvaluation.feedback}</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div
                      className={`p-2 rounded-lg ${
                        aiEvaluation.compliance.mentionsBrand
                          ? "bg-success-100"
                          : "bg-danger-100"
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {aiEvaluation.compliance.mentionsBrand ? "✓" : "✗"} Menciona marca
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${
                        aiEvaluation.compliance.usesHashtag
                          ? "bg-success-100"
                          : "bg-danger-100"
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {aiEvaluation.compliance.usesHashtag ? "✓" : "✗"} Usa hashtag
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${
                        aiEvaluation.compliance.showsProduct
                          ? "bg-success-100"
                          : "bg-danger-100"
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {aiEvaluation.compliance.showsProduct ? "✓" : "✗"} Mostra produto
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${
                        aiEvaluation.compliance.followsGuidelines
                          ? "bg-success-100"
                          : "bg-danger-100"
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {aiEvaluation.compliance.followsGuidelines
                          ? "✓"
                          : "✗"}{" "}
                        Segue diretrizes
                      </p>
                    </div>
                  </div>
                  {aiEvaluation.suggestions &&
                    aiEvaluation.suggestions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-primary-900 mb-2">
                          Sugestões:
                        </p>
                        <ul className="list-disc list-inside text-xs text-primary-900">
                          {aiEvaluation.suggestions.map(
                            (suggestion: string, idx: number) => (
                              <li key={idx}>{suggestion}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              ) : (
                <div className="bg-neutral-50 rounded-2xl p-4 text-center">
                  <p className="text-neutral-600">
                    Avaliação da IA não disponível
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleApprove(selectedContent)}
                disabled={isApproving}
                className="flex-1"
              >
                <div className="flex items-center gap-2">
                  <Icon name="Check" color="#16a34a" size={16} />
                  <span>{isApproving ? "Aprovando..." : "Aprovar"}</span>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleReject(selectedContent);
                }}
                disabled={isRejecting}
                className="flex-1"
              >
                <div className="flex items-center gap-2">
                  <Icon name="X" color="#dc2626" size={16} />
                  <span>Reprovar</span>
                </div>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de ação em massa */}
      {isBulkActionModalOpen && bulkActionType && (
        <Modal
          title={
            bulkActionType === "approve"
              ? "Aprovar conteúdos selecionados"
              : "Reprovar conteúdos selecionados"
          }
          onClose={() => {
            setIsBulkActionModalOpen(false);
            setBulkActionType(null);
            setBulkRejectionFeedback("");
            setBulkCaptionFeedback("");
            setBulkNewSubmissionDeadline("");
          }}
        >
          <div className="flex flex-col gap-6">
            <p className="text-sm text-neutral-600">
              {bulkActionType === "approve"
                ? `Você está prestes a aprovar ${selectedContents.size} conteúdo(s).`
                : `Você está prestes a reprovar ${selectedContents.size} conteúdo(s).`}
            </p>

            {(bulkActionType === "approve" || bulkActionType === "reject") && (
              <>
                {bulkActionType === "reject" && (
                  <div className="bg-danger-50 rounded-2xl p-4">
                    <p className="text-sm text-danger-900">
                      O feedback é obrigatório ao reprovar conteúdos em massa. Ele será
                      enviado a todos os influenciadores dos conteúdos selecionados.
                    </p>
                  </div>
                )}
                <Textarea
                  label={bulkActionType === "approve" ? "Feedback sobre o conteúdo (opcional)" : "Feedback sobre o conteúdo"}
                  placeholder="Explique o que precisa ser ajustado no conteúdo..."
                  value={bulkRejectionFeedback}
                  onChange={(e) => setBulkRejectionFeedback(e.target.value)}
                  error={
                    bulkActionType === "reject" && !bulkRejectionFeedback.trim()
                      ? "Este campo é obrigatório"
                      : undefined
                  }
                />
                <Textarea
                  label="Feedback sobre a legenda (opcional)"
                  placeholder="Explique o que precisa ser ajustado na legenda..."
                  value={bulkCaptionFeedback}
                  onChange={(e) => setBulkCaptionFeedback(e.target.value)}
                />
                <InputDate
                  label="Nova data limite para reenvio (opcional)"
                  value={bulkNewSubmissionDeadline}
                  onChange={setBulkNewSubmissionDeadline}
                  placeholder="Selecione uma data limite para o reenvio"
                  min={formatDateForInput(new Date())}
                />
              </>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulkActionModalOpen(false);
                  setBulkActionType(null);
                  setBulkRejectionFeedback("");
                  setBulkCaptionFeedback("");
                  setBulkNewSubmissionDeadline("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={
                  bulkActionType === "approve"
                    ? handleBulkApprove
                    : handleBulkReject
                }
                disabled={
                  (bulkActionType === "reject" && !bulkRejectionFeedback.trim()) ||
                  isBulkApproving ||
                  isBulkRejecting
                }
                className="flex-1"
              >
                {isBulkApproving || isBulkRejecting ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de preview ampliado */}
      {isPreviewModalOpen && previewModalUrls.length > 0 && (
        <Modal
          title={`Preview ${previewModalCurrentIndex + 1} de ${previewModalUrls.length}`}
          onClose={() => setIsPreviewModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <div className="relative w-full aspect-video bg-neutral-900 rounded-xl overflow-hidden">
              {renderSinglePreview(
                previewModalUrls[previewModalCurrentIndex],
                previewModalContentType
              )}
              
              {/* Navegação anterior/próximo */}
              {previewModalUrls.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewModalCurrentIndex((prev) =>
                        prev > 0 ? prev - 1 : previewModalUrls.length - 1
                      );
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    aria-label="Anterior"
                  >
                    <Icon name="ChevronLeft" color="#ffffff" size={24} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewModalCurrentIndex((prev) =>
                        prev < previewModalUrls.length - 1 ? prev + 1 : 0
                      );
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    aria-label="Próximo"
                  >
                    <Icon name="ChevronRight" color="#ffffff" size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Indicadores de thumbnails */}
            {previewModalUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {previewModalUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setPreviewModalCurrentIndex(index)}
                    className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === previewModalCurrentIndex
                        ? "border-primary-600 ring-2 ring-primary-200"
                        : "border-neutral-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    {renderSinglePreview(url, previewModalContentType)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
