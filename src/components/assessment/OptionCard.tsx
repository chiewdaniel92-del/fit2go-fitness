import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface OptionCardProps {
  label: string;
  description?: string | null;
  isSelected: boolean;
  onClick: () => void;
}

export function OptionCard({ label, description, isSelected, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full p-5 rounded-xl text-left transition-all duration-200 border-2 hover-lift",
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className={cn(
            "font-semibold text-lg mb-1 transition-colors",
            isSelected ? "text-primary" : "text-foreground"
          )}>
            {label}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
          isSelected 
            ? "border-primary bg-primary" 
            : "border-muted-foreground/30"
        )}>
          {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
        </div>
      </div>
    </button>
  );
}
