import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn, todayLabel } from "@/lib/utils";
import { Logo } from "./Logo";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] border-r border-line bg-app-surface/70 backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[286px] border-r border-line bg-app-surface transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-4 z-10 grid h-9 w-9 place-items-center rounded-xl bg-app-soft text-muted"
            aria-label="Menyu yopish"
          >
            <X size={17} />
          </button>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-30 border-b border-line bg-app/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setMobileOpen(true)}
              className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-line bg-app-surface text-muted lg:hidden"
              aria-label="Menyu"
            >
              <Menu size={18} />
            </button>
            <div className="lg:hidden">
              <Logo compact to={user?.role === "teacher" ? "/teacher" : "/student"} />
            </div>
            <div className="hidden lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {todayLabel()}
              </p>
              <p className="text-[13px] font-semibold">
                {user?.role === "teacher" ? "Ustoz paneli" : "O'quvchi paneli"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle className="hidden sm:grid" />
              <div className="flex items-center gap-2 rounded-xl border border-line bg-app-surface py-1 pl-1 pr-3">
                <Avatar first={user?.first_name} last={user?.last_name} size="xs" />
                <div className="hidden sm:block">
                  <p className="max-w-[140px] truncate text-[11px] font-bold leading-tight">
                    {user?.full_name}
                  </p>
                  <p className="text-[9px] uppercase tracking-wide text-muted">
                    {user?.role === "teacher" ? "Ustoz" : user?.group?.name || "O'quvchi"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>

        <footer className="mx-auto max-w-[1440px] px-4 pb-8 pt-2 text-[10px] text-muted/70 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} English Arena · Premium ingliz tili platformasi
        </footer>
      </div>
    </div>
  );
}
