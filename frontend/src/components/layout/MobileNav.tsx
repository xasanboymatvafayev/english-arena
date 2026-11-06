import { Bell, BookOpen, ClipboardList, Compass, LayoutDashboard, Library, Menu, UserRound, Users, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };

export function MobileNav({ onMore }: { onMore: () => void }) {
  const { user } = useAuth();
  if (!user) return null;

  const teacher: Item[] = [
    { to: "/teacher", label: "Asosiy", icon: LayoutDashboard, end: true },
    { to: "/teacher/groups", label: "Guruh", icon: UsersRound },
    { to: "/teacher/students", label: "O‘quvchi", icon: Users },
    { to: "/teacher/assignments", label: "Vazifa", icon: ClipboardList },
  ];
  const student: Item[] = [
    { to: "/student", label: "Asosiy", icon: LayoutDashboard, end: true },
    { to: "/student/assignments", label: "Vazifa", icon: ClipboardList },
    { to: "/student/library", label: "Kitob", icon: Library },
    { to: "/student/dictionary", label: "Lug‘at", icon: BookOpen },
  ];
  const items = user.role === "teacher" ? teacher : student;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-app-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-semibold transition",
                  isActive ? "text-brand" : "text-muted"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn("grid h-8 w-8 place-items-center rounded-xl transition", isActive && "bg-brand/10")}>
                    <Icon size={17} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
        <button onClick={onMore} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-semibold text-muted">
          <span className="grid h-8 w-8 place-items-center rounded-xl"><Menu size={17} /></span>
          Ko‘proq
        </button>
      </div>
    </nav>
  );
}
