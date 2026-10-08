import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => (
  <>
    {/* UI NOTIFICATION LAYER */}
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
  </>
);

export default App;

