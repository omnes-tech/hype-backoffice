import { Icon } from "@/components/ui/icon";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="w-full h-full bg-black/80 fixed inset-0 z-50 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-neutral-50 p-8 rounded-2xl">
        <div className="w-full flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium text-neutral-950">{title}</h1>

          <Icon name="X" size={24} color="#525252" onClick={onClose} />
        </div>

        {children}
      </div>
    </div>
  );
}
