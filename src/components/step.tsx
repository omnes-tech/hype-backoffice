interface StepProps {
  progressPercentage: number;
  currentStep: number;
  totalSteps: number;
}

export function Step({
  progressPercentage,
  currentStep,
  totalSteps,
}: StepProps) {
  return (
    <div className="w-full flex items-center flex-col gap-1">
      <div className="w-full bg-neutral-200 rounded-full h-2">
        <div
          className="bg-success-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <span className="text-xs text-neutral-600">
        Passo {currentStep} de {totalSteps}
      </span>
    </div>
  );
}
