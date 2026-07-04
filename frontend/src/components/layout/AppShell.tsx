import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { ScrollToTop } from "../common/ScrollToTop";
import { PullToRefresh } from "../common/PullToRefresh";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <ScrollToTop />
      <Header />
      <PullToRefresh />
      <motion.main
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-2xl flex-1 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
      >
        {children}
      </motion.main>
      <BottomNav />
    </div>
  );
}
