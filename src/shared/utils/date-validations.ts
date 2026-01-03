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
 */
export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Valida data da fase 1: não pode ser menor que 10 dias da data atual
 */
export const validatePhase1Date = (date: string): { valid: boolean; error?: string; minDate?: string } => {
  if (!date) {
    return { valid: true }; // Permite campo vazio
  }

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const minDate = addDays(today, 10);
  minDate.setHours(0, 0, 0, 0);

  if (selectedDate < minDate) {
    return {
      valid: false,
      error: `A data prevista para a primeira entrega não pode ser menor que 10 dias da data atual. Data mínima: ${minDate.toLocaleDateString("pt-BR")}`,
      minDate: formatDateForInput(minDate),
    };
  }

  return { valid: true, minDate: formatDateForInput(minDate) };
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

  const selectedDate = new Date(date);
  const prevDate = new Date(previousPhaseDate);
  prevDate.setHours(0, 0, 0, 0);
  
  const minDate = addDays(prevDate, 3);
  minDate.setHours(0, 0, 0, 0);

  if (selectedDate < minDate) {
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

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Deve ser maior que hoje
  if (selectedDate <= today) {
    return {
      valid: false,
      error: "A data limite precisa ser maior que a data atual.",
      minDate: formatDateForInput(addDays(today, 1)),
    };
  }

  if (!phase1Date) {
    return { valid: true }; // Se não há fase 1, não valida o limite superior
  }

  const phase1 = new Date(phase1Date);
  phase1.setHours(0, 0, 0, 0);
  
  // Deve ser 7 dias menor que a fase 1
  const maxDate = addDays(phase1, -7);
  maxDate.setHours(0, 0, 0, 0);

  if (selectedDate >= phase1) {
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

