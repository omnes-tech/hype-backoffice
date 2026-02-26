import { Icon } from "@/components/ui/icon";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const handleCloseClick = () => {
    onClose();
  };

  return (
    <div 
      className="w-full h-full bg-black/60 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full max-w-4xl bg-white p-8 rounded-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-neutral-200/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-neutral-950 tracking-tight">{title}</h1>

          <button
            type="button"
            onClick={handleCloseClick}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Fechar"
          >
            <Icon name="X" size={20} color="#525252" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
