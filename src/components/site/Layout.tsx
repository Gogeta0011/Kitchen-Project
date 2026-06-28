import type { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { MobileBottomBar } from "./MobileBottomBar";

export function Layout({ children, heroNav = false }: { children: ReactNode; heroNav?: boolean }) {
  return (
    <div className="min-h-screen bg-cream dark:bg-cream text-ink dark:text-ink pb-24 md:pb-0">
      <Nav />
      <main className="page-enter"><ErrorBoundary>{children}</ErrorBoundary></main>
      <Footer />
      <MobileBottomBar />
    </div>
  );
}
