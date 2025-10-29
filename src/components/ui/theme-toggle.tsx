import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Minus } from "lucide-react";
import { useId } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const items = [
  { value: "light", label: "Light", image: "https://originui.com/ui-light.png" },
  { value: "dark", label: "Dark", image: "https://originui.com/ui-dark.png" },
  { value: "system", label: "System", image: "https://originui.com/ui-system.png" },
];

interface ThemeToggleProps {
  value?: string;
  onChange?: (value: string) => void;
}

function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  const id = useId();
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    onChange?.(newTheme);
  };

  return (
    <fieldset className="space-y-4 max-w-[400px] mt-1">
      {/* <legend className="text-sm font-medium leading-none text-foreground">Choose a theme</legend> */}
      <RadioGroup 
        className="flex gap-3" 
        value={value || theme || "system"} 
        onValueChange={handleThemeChange}
      >
        {items.map((item) => {
          const isSelected = (value || theme || "system") === item.value;
          return (
            <label key={`${id}-${item.value}`}>
              <RadioGroupItem
                id={`${id}-${item.value}`}
                value={item.value}
                className="peer sr-only after:absolute after:inset-0"
              />
              <img
                src={item.image}
                alt={item.label}
                width={88}
                height={70}
                className={cn(
                  "relative cursor-pointer overflow-hidden rounded-lg border border-input shadow-sm shadow-black/5 outline-offset-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-ring/70 peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-50",
                  isSelected && "border-ring bg-accent"
                )}
              />
              <span className={cn(
                "group mt-2 flex items-center gap-1",
                !isSelected && "text-muted-foreground/70"
              )}>
                <Check
                  size={16}
                  strokeWidth={2}
                  className={cn(isSelected ? "block" : "hidden")}
                  aria-hidden="true"
                />
                <Minus
                  size={16}
                  strokeWidth={2}
                  className={cn(isSelected ? "hidden" : "block")}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium">{item.label}</span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}

export { ThemeToggle };
