import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className={cn(
        "focus-ring relative grid h-9 w-9 place-items-center rounded-xl border border-line bg-app-soft text-muted transition hover:text-ink",
        className
      )}
      aria-label={theme === "dark" ? "Yorug' rejim" : "Qorong'i rejim"}
      title={theme === "dark" ? "Yorug' rejim" : "Qorong'i rejim"}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
