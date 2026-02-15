import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAppStore } from "@/stores/appStore";
import { Dashboard } from "@/pages/Dashboard";
import { Organize } from "@/pages/Organize";
import { Marketplace } from "@/pages/Marketplace";
import { Settings } from "@/pages/Settings";
import { motion, AnimatePresence } from "framer-motion";

const pageComponents = {
  dashboard: Dashboard,
  organize: Organize,
  marketplace: Marketplace,
  settings: Settings,
};

export function MainLayout() {
  const { currentPage } = useAppStore();
  const PageComponent = pageComponents[currentPage];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
