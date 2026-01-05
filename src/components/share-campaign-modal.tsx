import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ShareCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignTitle: string;
}

export function ShareCampaignModal({
  isOpen,
  onClose,
  campaignId,
  campaignTitle,
}: ShareCampaignModalProps) {
  const [copied, setCopied] = useState(false);
  
  // Construir o link da campanha
  const campaignUrl = `${window.location.origin}/campaigns/${campaignId}`;
  const shareText = `Confira esta campanha: ${campaignTitle}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

  const shareOnWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${campaignUrl}`)}`;
    window.open(url, "_blank");
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(campaignUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(campaignUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareOnTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(campaignUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Compartilhar campanha: ${campaignTitle}`);
    const body = encodeURIComponent(`${shareText}\n\n${campaignUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} title="Compartilhar campanha">
      <div className="flex flex-col gap-6">
        {/* Link da campanha */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-950">
            Link da campanha
          </label>
          <div className="flex items-center justify-between gap-2 w-full">
            <Input
              value={campaignUrl}
              readOnly
              style={{ width: "100%" }}
            />
            <Button
              variant="outline"
              onClick={handleCopyLink}
              style={{ width: "fit-content" }}
            >
              <div className="flex items-center gap-2">
                <Icon
                  name={copied ? "Check" : "Copy"}
                  size={16}
                  color={copied ? "#10B981" : "#404040"}
                />
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </div>
            </Button>
          </div>
        </div>

        {/* Botões de compartilhamento */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-neutral-950">
            Compartilhar em
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={shareOnWhatsApp}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Icon name="MessageCircle" size={20} color="#25D366" />
              <span className="font-medium">WhatsApp</span>
            </Button>

            <Button
              variant="outline"
              onClick={shareOnFacebook}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Icon name="Share2" size={20} color="#1877F2" />
              <span className="font-medium">Facebook</span>
            </Button>

            <Button
              variant="outline"
              onClick={shareOnTwitter}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Icon name="Share2" size={20} color="#1DA1F2" />
              <span className="font-medium">Twitter</span>
            </Button>

            <Button
              variant="outline"
              onClick={shareOnLinkedIn}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Icon name="Share2" size={20} color="#0077B5" />
              <span className="font-medium">LinkedIn</span>
            </Button>

            <Button
              variant="outline"
              onClick={shareOnTelegram}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Icon name="Send" size={20} color="#0088CC" />
              <span className="font-medium">Telegram</span>
            </Button>

            <Button
              variant="outline"
              onClick={shareViaEmail}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Icon name="Mail" size={20} color="#404040" />
              <span className="font-medium">E-mail</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

