"use client";
import React from "react";
import type { CardComponentProps } from "onborda";
import { useOnborda } from "onborda";

export const TourCard: React.FC<CardComponentProps> = ({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}) => {
  const { closeOnborda } = useOnborda();

  function handleClose() {
    closeOnborda();
    // You can add any other actions needed on tour completion here
  }

  return (
    <div className="bg-background p-4 rounded-lg shadow-lg w-[300px] max-w-full text-sm">
      <div className="flex justify-between items-center mb-2">
        <p className="font-semibold text-lg">
          {step.icon && <span className="mr-2">{step.icon}</span>}
          {step.title}
        </p>
        <button 
          onClick={() => closeOnborda()} 
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close tour"
        >
          ✕
        </button>
      </div>

      <div className="mb-4 text-muted-foreground">{step.content}</div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {currentStep + 1} of {totalSteps}
        </p>
        <div className="space-x-2">
          {currentStep !== 0 && (
            <button 
              onClick={() => prevStep()}
              className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded"
            >
              Previous
            </button>
          )}
          {currentStep + 1 !== totalSteps && (
            <button 
              onClick={() => nextStep()}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/80 rounded"
            >
              Next
            </button>
          )}
          {currentStep + 1 === totalSteps && (
            <button 
              onClick={handleClose}
              className="px-3 py-1.5 text-xs bg-green-500 text-white hover:bg-green-600 rounded"
            >
              🎉 Finish!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 