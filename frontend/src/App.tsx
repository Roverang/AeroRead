import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

/**
 * THE SYSTEM CORE
 * QueryClient is configured with specific stale times to ensure 
 * the 'Soul' (IndexedDB/Cache) remains responsive even if the 
 * MongoDB backend is under heavy load during ingestion.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes of 'soul' persistence
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* UI NOTIFICATION LAYER */}
      <Toaster />
      <Sonner 
        position="bottom-right" 
        theme="dark" 
        expand={false}
        richColors
        closeButton
        // ORV Theme Customization
        toastOptions={{
          className: "literary-panel rounded-none border-primary/30 bg-reader text-foreground font-mono",
        }}
      />

      <BrowserRouter>
        <Routes>
          {/* THE MAIN SCENARIO */}
          <Route path="/" element={<Index />} />
          
          {/* SYSTEM NOTE: 
            The Index page will manage the state between the 
            ArchiveGrid (Library) and the ReaderView (The Fourth Wall).
          */}
          
          {/* THE FAILSAFE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;