import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  BookMarked,
  ClipboardList,
  Coins,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Users,
  UsersRound,
  Gift,
  MailPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "./ThemeToggle";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const teacherNav: NavGroup[] = [
  {
    title: "Boshqaruv",
    items: [
      { to: "/teacher", label: "Boshqaruv paneli", icon: LayoutDashboard, end: true },
      { to: "/teacher/groups", label: "Guruhlar", icon: UsersRound },
      { to: "/teacher/students", label: "O'quvchilar", icon: Users },
      { to: "/teacher/invitations", label: "Takliflar", icon: MailPlus },
    ],
  },
  {
    title: "O'quv jarayoni",
    items: [
      { to: "/teacher/assignments", label: "Vazifalar", icon: ClipboardList },
      { to: "/teacher/coins", label: "Coinlar", icon: Coins },
      { to: "/teacher/rewards", label: "Sovg'alar", icon: Gift },
      { to: "/teacher/library", label: "Kutubxona", icon: BookOpen },
      { to: "/teacher/announcements", label: "E'lonlar", icon: Bell },
      { to: "/teacher/motivation", label: "Motivatsiya", icon: Target },
    ],
  },
  {
    title: "O'rganish",
    items: [
      { to: "/teacher/dictionary", label: "Lug'at", icon: BookMarked },
      { to: "/teacher/irregular-verbs", label: "Fe'llar", icon: MessageSquareText },
    ],
  },
];

const studentNav: NavGroup[] = [
  {
    title: "Asosiy",
    items: [
      { to: "/student", label: "Boshqaruv paneli", icon: LayoutDashboard, end: true },
      { to: "/student/assignments", label: "Vazifalar", icon: ClipboardList },
      { to: "/student/coins", label: "Coinlarim", icon: Coins },
      { to: "/student/rewards", label: "Sovg'alar", icon: Gift },
      { to: "/student/leaderboard", label: "Reyting", icon: Trophy },
    ],
  },
  {
    title: "O'rganish",
    items: [
      { to: "/student/library", label: "Kutubxona", icon: BookOpen },
      { to: "/student/dictionary", label: "Lug'at", icon: BookMarked },
      { to: "/student/irregular-verbs", label: "Fe'llar", icon: MessageSquareText },
      { to: "/student/activity", label: "Faoliyatim", icon: Activity },
    ],
  },
  {
    title: "Boshqa",
    items: [
      { to: "/student/announcements", label: "E'lonlar", icon: Bell },
      { to: "/student/profile", label: "Profil", icon: UserRound },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const groups = user?.role === "teacher" ? teacherNav : studentNav;
  const icon = user?.role === "teacher" ? GraduationCap : Sparkles;

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-6">
        <Logo to={user?.role === "teacher" ? "/teacher" : "/student"} />
      </div>

      <div className="mx-5 mb-4 h-px bg-line" />

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted/70">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.end
                  ? location.pathname === item.to
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition",
                      active
                        ? "bg-gradient-to-r from-brand/[0.18] to-brand/[0.03] text-ink"
                        : "text-muted hover:bg-app-soft hover:text-ink"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-lg transition",
                        active
                          ? "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(109,94,245,0.9)]"
                          : "bg-app-soft text-muted group-hover:text-ink"
                      )}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-2xl bg-app-soft/70 p-3">
          <Avatar first={user?.first_name} last={user?.last_name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold">{user?.full_name}</p>
            <p className="flex items-center gap-1 overflow-hidden text-[10px] text-muted">
              <span className="shrink-0">{icon === GraduationCap ? "Ustoz" : "O'quvchi"}</span>
              {user?.role === "student" && user.group && (
                <span className="truncate">· {user.group.name}</span>
              )}
            </p>
          </div>
          <ThemeToggle className="h-8 w-8 shrink-0" />
          <button
            onClick={logout}
            className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-rose-500/10 hover:text-rose-400"
            aria-label="Chiqish"
            title="Chiqish"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
