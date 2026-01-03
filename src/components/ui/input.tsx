import type { ComponentProps, HTMLInputTypeAttribute } from "react";

interface InputProps extends ComponentProps<"input"> {
  label?: string;
  icon?: React.ReactNode;
  type?: HTMLInputTypeAttribute;
  error?: string;
}

export function Input({
  label,
  icon,
  error,
  type = "text",
  onChange,
  ...props
}: InputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevenir números negativos em inputs do tipo number
    if (type === "number") {
      const value = e.target.value;
      
      // Permite campo vazio ou apenas o sinal de menos sendo removido
      if (value === "" || value === "-") {
        if (onChange) {
          const newEvent = { ...e, target: { ...e.target, value: "" } };
          onChange(newEvent as React.ChangeEvent<HTMLInputElement>);
        }
        return;
      }
      
      const numValue = parseFloat(value);
      
      // Se for negativo ou NaN, não atualiza
      if (isNaN(numValue) || numValue < 0) {
        return;
      }
    }
    
    // Chamar o onChange original se fornecido
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={props.id} className="text-neutral-950 font-medium">
          {label}
        </label>
      )}

      <div className="w-full h-11 rounded-3xl bg-neutral-100 flex items-center justify-between gap-2 px-4 focus-within:bg-neutral-200/70 transition-colors duration-150">
        <input
          type={type}
          className="w-full h-full rounded-3xl outline-none placeholder:text-neutral-400 text-neutral-950"
          {...props}
          onChange={handleChange}
          min={type === "number" ? "0" : undefined}
        />

        {icon}
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}
