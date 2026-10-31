import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "./Header";
import { UploadProgress } from "../common/UploadProgress";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { CONTENT_WIDTH } from "./contentWidth";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { ChangelogBanner } from "./ChangelogBanner";
import { ScrollToTop } from "../common/ScrollToTop";
import { PullToRefresh } from "../common/PullToRefresh";
import { LoadingSpinner } from "../common/LoadingSpinner";

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
      <LoadingSpinner />
    </div>
  );
}

/** How far a page slides in. Enter-only: an exit animation keeps the old page mounted next to the new one, which changes
 * the page height for a few frames and made the fixed bottom nav jump (same reason as the trip switch in TripOverviewTab). */
const SLIDE_PX = 36;

/** The pages inside a trip are one "section", so moving between trips keeps its own slide instead of restarting this one. */
const sectionOf = (pathname: string) => (pathname.startsWith("/trips/") || pathname.startsWith("/trip/") || pathname === "/trip" ? "trip" : pathname);

export function AppShell() {
  const { pathname } = useLocation();
  const section = sectionOf(pathname);
  const previous = useRef(section);
  // Going into an event (from the Agenda, the Hub, a search) pushes it in from the right; coming out of one slides back
  // in from the left; the tabs just fade. That is what says "you moved to another page", also when the first card on it
  // looks like the one you tapped.
  const changed = previous.current !== section;
  const from = !changed ? 0 : section === "trip" ? SLIDE_PX : previous.current === "trip" ? -SLIDE_PX : 0;
  useEffect(() => {
    previous.current = section;
  }, [section]);

  return (
    <div className="flex min-h-[100dvh] flex-col md:pl-[76px] lg:pl-60">
      <ScrollToTop />
      <Sidebar />
      <AnnouncementBanner fallback={<ChangelogBanner />} />
      <UploadProgress />
      <Header />
      <PullToRefresh />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        // overflow-x-clip on <main>, not on the page inside it: the sliding page must never widen the screen (or the fixed bottom nav
        // shifts with it), and clipping at main's edge leaves what overhangs the content into its padding alone.
        className={`mx-auto w-full flex-1 overflow-x-clip px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:px-8 md:pt-8 md:pb-16 lg:px-10 ${CONTENT_WIDTH}`}
      >
        <motion.div
          key={section}
          initial={changed ? { opacity: 0, x: from } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <Suspense fallback={<TabFallback />}>
            <Outlet />
          </Suspense>
        </motion.div>
      </motion.main>
      <BottomNav />
    </div>
  );
}
