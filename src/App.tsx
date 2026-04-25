import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Browse from "./pages/Browse";
import ProductDetail from "./pages/ProductDetail";
import Sell from "./pages/Sell";
import { ChatList, ChatWindow } from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import TermsOfService from "./pages/TermsOfService";
import Articles from "./pages/Articles";
import EditProfile from "./pages/EditProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen bg-background flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/sell" element={
                    <ProtectedRoute>
                      <Sell />
                    </ProtectedRoute>
                  } />
                  <Route path="/edit/:id" element={
                    <ProtectedRoute>
                      <Sell />
                    </ProtectedRoute>
                  } />
                  <Route path="/chats" element={
                    <ProtectedRoute>
                      <ChatList />
                    </ProtectedRoute>
                  } />
                  <Route path="/chats/:chatId" element={
                    <ProtectedRoute>
                      <ChatWindow />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile/edit" element={
                    <ProtectedRoute>
                      <EditProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/cbs-admin" element={
                    <ProtectedRoute adminOnly>
                      <Admin />
                    </ProtectedRoute>
                  } />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/articles" element={<Articles />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
