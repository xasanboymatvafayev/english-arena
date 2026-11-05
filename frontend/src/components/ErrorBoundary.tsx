import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/Button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("English Arena render error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-3xl border border-rose-500/25 bg-app-surface p-8 text-center shadow-card">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-400">
              <AlertTriangle size={26} />
            </div>
            <h1 className="display mt-5 text-xl font-extrabold">Sahifada xatolik yuz berdi</h1>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Sahifani yangilang. Muammo davom etsa, ustozingizga xabar bering.
            </p>
            <pre className="mt-4 max-h-32 overflow-auto rounded-xl bg-app-soft p-3 text-left text-[10px] text-rose-400">
              {this.state.error.message}
            </pre>
            <Button className="mt-5" onClick={() => window.location.reload()}>
              <RefreshCw size={15} /> Sahifani yangilash
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
