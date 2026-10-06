import { Component } from "react";
import { TriangleAlert } from "lucide-react";
import Card from "./Card";
import Button from "./Button";

// Catches render-time exceptions anywhere below it in the tree (a bad API
// response shape, a null a component didn't expect, etc.) so the user sees
// a recoverable message instead of a blank white screen. Does NOT catch
// errors inside async handlers/promises -- those are handled per-page via
// try/catch + toast, same as the rest of the app.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-24 text-center">
          <Card>
            <TriangleAlert className="mx-auto h-8 w-8 text-danger-500" strokeWidth={1.75} />
            <h1 className="mt-3 font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              The page hit an unexpected error. Reloading usually fixes it.
            </p>
            <Button className="mt-5" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
