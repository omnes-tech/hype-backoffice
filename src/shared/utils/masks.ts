/**
 * Formata um número removendo caracteres não numéricos
 */
export const formatNumber = (value: string): string => {
  return value.replace(/\D/g, "");
};

/**
 * Formata um número com separador de milhar
 */
export const formatNumberWithSeparator = (value: string): string => {
  const numbers = formatNumber(value);
  if (!numbers) return "";
  
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Aplica máscara de número com separador de milhar em um input
 * Previne números negativos
 */
export const handleNumberInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  callback: (value: string) => void
): void => {
  // Remove caracteres não numéricos e o sinal de menos
  const cleaned = e.target.value.replace(/[^\d]/g, "");
  
  // Se o valor estiver vazio, permite (para poder limpar o campo)
  if (cleaned === "") {
    callback("");
    return;
  }
  
  // Formata com separador de milhar
  const formatted = formatNumberWithSeparator(cleaned);
  callback(formatted);
};

/**
 * Valida e previne números negativos em inputs do tipo number
 */
export const handleNumberInputMinZero = (
  e: React.ChangeEvent<HTMLInputElement>,
  callback: (value: string) => void
): void => {
  const value = e.target.value;
  
  // Se estiver vazio, permite (para poder limpar o campo)
  if (value === "" || value === "-") {
    callback("");
    return;
  }
  
  // Converte para número e verifica se é negativo
  const numValue = parseFloat(value);
  
  // Se for negativo ou NaN, não atualiza
  if (isNaN(numValue) || numValue < 0) {
    // Se o usuário está tentando digitar um número negativo, ignora
    return;
  }
  
  callback(value);
};

/**
 * Remove a formatação e retorna apenas números
 */
export const unformatNumber = (value: string): string => {
  return formatNumber(value);
};

