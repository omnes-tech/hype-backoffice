import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(private)/(app)/campaigns")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-xl flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <p className="text-2xl font-medium text-neutral-950">
            Nenhuma campanha por aqui... ainda!
          </p>

          <span className="text-neutral-600 text-center">
            Dê o primeiro passo: crie sua primeira campanha e comece a
            impulsionar sua marca no Hype.
          </span>
        </div>

        <div className="w-fit">
          <Button>
            <p className="text-neutral-50 font-semibold">
              Criar minha primeira campanha
            </p>
          </Button>
        </div>
      </div>
    </div>
  );
}
