import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { CONTENT_WIDTH } from "./contentWidth";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { ChangelogBanner } from "./ChangelogBanner";
import { ScrollToTop } from "../common/ScrollToTop";
import { PullToRefresh } from "../common/PullToRefresh";

// A lightweight in-place loader for switching between lazy-loaded tabs — no
// background of its own, so it never flashes a different color than the
// page underneath it. Deliberately not full-screen: Header/BottomNav live
// outside this Suspense boundary (see router.tsx, where the five bottom-nav
// pages nest under a single <AppShell/> layout route instead of each getting
// their own <AppShell> instance) so they stay mounted across tab switches
// instead of tearing down and rebuilding on every navigation.
function TabFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 rounded-full border-2 border-ink-3 border-t-transparent animate-spin" />
    </div>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-[100dvh] flex-col md:pl-[76px] lg:pl-60">
      <ScrollToTop />
      <Sidebar />
      <AnnouncementBanner />
      <ChangelogBanner />
      <Header />
      <PullToRefresh />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`mx-auto w-full flex-1 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:px-8 md:pt-8 md:pb-16 lg:px-10 ${CONTENT_WIDTH}`}
      >
        <Suspense fallback={<TabFallback />}>
          <Outlet />
        </Suspense>
      </motion.main>
      <BottomNav />
    </div>
  );
}
