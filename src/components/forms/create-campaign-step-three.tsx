import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/text-area";

interface CreateCampaignStepThreeProps {
  onBack: () => void;
  onNext: () => void;
}

export function CreateCampaignStepThree({
  onBack,
  onNext,
}: CreateCampaignStepThreeProps) {
  return (
    <form className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Select
          label="Tipo de remuneração"
          placeholder="Escolha como os influenciadores serão pagos"
          options={[
            { label: "Por postagem", value: "post" },
            { label: "Por like", value: "like" },
            { label: "Por comentário", value: "comment" },
            { label: "Por compartilhamento", value: "share" },
            { label: "Por interação", value: "interaction" },
            { label: "Por engajamento", value: "engagement" },
            { label: "Por venda", value: "sale" },
          ]}
        />

        <Textarea
          label="Benefícios Inclusos na Campanha"
          placeholder="Liste em tópicos os benefícios oferecidos na campanha.

  . Cupom de desconto de R$250,00 para gastar em nossa loja online.
  . Kit exclusivo com produtos da marca."
        />

        <Textarea
          label="O que fazer"
          labelColor="text-success-600"
          placeholder="Oriente o influenciador sobre o que deve ser feito.

  . Mencionar a marca no início do vídeo.
  . Usar hashtag oficial #CampanhaBrand.
  . Mostrar o produto sendo utilizado."
        />

        <Textarea
          label="O que NÃO fazer"
          labelColor="text-danger-600"
          placeholder="Oriente o influenciador sobre o que NÃO deve ser feito.

  . Cupom de desconto de R$250,00 para gastar em nossa loja online.
  . Kit exclusivo com produtos da marca."
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="w-fit">
          <Button variant="outline" onClick={onBack}>
            <div className="flex items-center justify-center gap-2">
              <Icon name="ArrowLeft" size={16} color="#404040" />

              <p className="text-neutral-700 font-semibold">Voltar</p>
            </div>
          </Button>
        </div>

        <div className="w-fit">
          <Button onClick={onNext}>
            <div className="flex items-center justify-center gap-2">
              <p className="text-neutral-50 font-semibold">Avançar</p>

              <Icon name="ArrowRight" size={16} color="#FAFAFA" />
            </div>
          </Button>
        </div>
      </div>
    </form>
  );
}
