import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StepContainerProps {
  children: ReactNode;
  className?: string;
}

export function StepContainer({ children, className }: StepContainerProps) {
  return (
    <div
      className={cn(
        "w-full max-w-2xl mx-auto px-6 py-8 animate-fade-in",
        className
      )}
    >
      {children}
    </div>
  );
}
