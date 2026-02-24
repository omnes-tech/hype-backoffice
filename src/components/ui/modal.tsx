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

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div 
      className="w-full h-full bg-black/80 fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full max-w-4xl bg-neutral-50 p-8 rounded-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium text-neutral-950">{title}</h1>

          <Icon
            name="X"
            size={24}
            color="#525252"
            onClick={handleCloseClick}
            className="cursor-pointer"
          />
        </div>

        {children}
      </div>
    </div>
  );
}
