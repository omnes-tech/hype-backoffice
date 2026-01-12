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

/**
 * Formata um valor monetário no padrão brasileiro (1.234,56)
 * Recebe apenas números (string) e formata como moeda
 */
export const formatCurrency = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return "";
  
  // Converte para número inteiro (em centavos)
  const numValue = parseInt(numbers, 10);
  if (isNaN(numValue)) return "";
  
  // Converte centavos para reais
  const reais = numValue / 100;
  
  // Formata com 2 casas decimais, separador de milhar (.) e decimal (,)
  return reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Remove a formatação monetária e retorna apenas números (em centavos)
 */
export const unformatCurrency = (value: string): string => {
  // Remove tudo que não é número
  return value.replace(/\D/g, "");
};

/**
 * Aplica máscara de valor monetário brasileiro em um input
 * Formato: R$ 1.234,56
 * O valor é armazenado formatado (1.234,56) mas pode ser convertido para centavos com unformatCurrency
 */
export const handleCurrencyInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  callback: (value: string) => void
): void => {
  // Remove R$, espaços e mantém apenas números
  const cleaned = e.target.value.replace(/\D/g, "");
  
  // Se o valor estiver vazio, permite (para poder limpar o campo)
  if (cleaned === "") {
    callback("");
    return;
  }
  
  // Formata como moeda brasileira (sem o R$)
  const formatted = formatCurrency(cleaned);
  // Armazena o valor formatado (1.234,56) para exibição
  callback(formatted);
};

