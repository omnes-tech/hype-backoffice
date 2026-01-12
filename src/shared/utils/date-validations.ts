/**
 * Adiciona dias a uma data
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Formata data para YYYY-MM-DD (formato do input date)
 * Usa métodos locais para evitar problemas de timezone
 */
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Calcula a data mínima para fase 1 (10 dias a partir de hoje)
 */
export const getPhase1MinDate = (): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = addDays(today, 10);
  minDate.setHours(0, 0, 0, 0);
  return formatDateForInput(minDate);
};

/**
 * Valida data da fase 1: não pode ser menor que 10 dias da data atual
 */
export const validatePhase1Date = (date: string): { valid: boolean; error?: string; minDate?: string } => {
  const minDateStr = getPhase1MinDate();
  // Criar data mínima a partir da string (evita problemas de timezone)
  const [minYear, minMonth, minDay] = minDateStr.split("-").map(Number);
  const minDate = new Date(minYear, minMonth - 1, minDay);
  minDate.setHours(0, 0, 0, 0);
  
  if (!date) {
    return { valid: true, minDate: minDateStr }; // Permite campo vazio
  }

  // Criar data a partir da string no formato YYYY-MM-DD (evita problemas de timezone)
  const [year, month, day] = date.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day);
  selectedDate.setHours(0, 0, 0, 0);

  // Comparar apenas as datas (sem horas)
  if (selectedDate.getTime() < minDate.getTime()) {
    // Formatar a data mínima para exibição (usando a mesma lógica de parsing)
    const minDateFormatted = minDate.toLocaleDateString("pt-BR");
    return {
      valid: false,
      error: `A data prevista para a primeira entrega não pode ser menor que 10 dias da data atual. Data mínima: ${minDateFormatted}`,
      minDate: minDateStr,
    };
  }

  return { valid: true, minDate: minDateStr };
};

/**
 * Valida data de fases subsequentes: não pode ser menor que 3 dias da fase anterior
 */
export const validateSubsequentPhaseDate = (
  date: string,
  previousPhaseDate: string
): { valid: boolean; error?: string; minDate?: string } => {
  if (!date) {
    return { valid: true }; // Permite campo vazio
  }

  if (!previousPhaseDate) {
    return { valid: true }; // Se não há fase anterior, não valida
  }

  // Criar data a partir da string no formato YYYY-MM-DD (evita problemas de timezone)
  const [year, month, day] = date.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day);
  selectedDate.setHours(0, 0, 0, 0);
  
  const [prevYear, prevMonth, prevDay] = previousPhaseDate.split("-").map(Number);
  const prevDate = new Date(prevYear, prevMonth - 1, prevDay);
  prevDate.setHours(0, 0, 0, 0);
  
  const minDate = addDays(prevDate, 3);
  minDate.setHours(0, 0, 0, 0);

  // Comparar apenas as datas (sem horas)
  if (selectedDate.getTime() < minDate.getTime()) {
    return {
      valid: false,
      error: `A data prevista entre uma fase e outra não pode ser menor que 3 dias. Data mínima: ${minDate.toLocaleDateString("pt-BR")}`,
      minDate: formatDateForInput(minDate),
    };
  }

  return { valid: true, minDate: formatDateForInput(minDate) };
};

/**
 * Valida data limite do mural (Ativar Descobrir):
 * - Precisa ser maior que a data atual
 * - Precisa ser 7 dias menor que a data prevista da fase 1
 */
export const validateMuralEndDate = (
  date: string,
  phase1Date: string
): { valid: boolean; error?: string; minDate?: string; maxDate?: string } => {
  if (!date) {
    return { valid: true }; // Permite campo vazio
  }

  // Criar data a partir da string no formato YYYY-MM-DD (evita problemas de timezone)
  const [year, month, day] = date.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day);
  selectedDate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Deve ser maior que hoje
  if (selectedDate.getTime() <= today.getTime()) {
    return {
      valid: false,
      error: "A data limite precisa ser maior que a data atual.",
      minDate: formatDateForInput(addDays(today, 1)),
    };
  }

  if (!phase1Date) {
    return { valid: true }; // Se não há fase 1, não valida o limite superior
  }

  const [phase1Year, phase1Month, phase1Day] = phase1Date.split("-").map(Number);
  const phase1 = new Date(phase1Year, phase1Month - 1, phase1Day);
  phase1.setHours(0, 0, 0, 0);
  
  // Deve ser 7 dias menor que a fase 1
  const maxDate = addDays(phase1, -7);
  maxDate.setHours(0, 0, 0, 0);

  if (selectedDate.getTime() >= phase1.getTime()) {
    return {
      valid: false,
      error: `A data limite para receber inscrições precisa ser pelo menos 7 dias menor que a data prevista da fase 1. Data máxima: ${maxDate.toLocaleDateString("pt-BR")}`,
      maxDate: formatDateForInput(maxDate),
    };
  }

  return {
    valid: true,
    minDate: formatDateForInput(addDays(today, 1)),
    maxDate: formatDateForInput(maxDate),
  };
};

/**
 * Calcula data limite para influenciador enviar conteúdo (4 dias antes da fase)
 */
export const calculateContentSubmissionDeadline = (phaseDate: string): string | null => {
  if (!phaseDate) return null;
  
  const phase = new Date(phaseDate);
  const deadline = addDays(phase, -4);
  return formatDateForInput(deadline);
};

/**
 * Calcula data limite para influenciador enviar conteúdo corrigido (1 dia antes da fase)
 */
export const calculateCorrectedContentDeadline = (phaseDate: string): string | null => {
  if (!phaseDate) return null;
  
  const phase = new Date(phaseDate);
  const deadline = addDays(phase, -1);
  return formatDateForInput(deadline);
};

