import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";

/* Route-based code splitting — each page is a separate chunk */
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Browse = lazy(() => import("./pages/Browse"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Sell = lazy(() => import("./pages/Sell"));
const ChatList = lazy(() => import("./pages/Chat").then(m => ({ default: m.ChatList })));
const ChatWindow = lazy(() => import("./pages/Chat").then(m => ({ default: m.ChatWindow })));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Articles = lazy(() => import("./pages/Articles"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));

/* Loading fallback for route transitions */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <div className="min-h-screen bg-background flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Suspense fallback={<PageLoader />}>
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
                    <Route path="/terms" element={<TermsOfService defaultTab="terms" />} />
                    <Route path="/privacy" element={<TermsOfService defaultTab="privacy" />} />
                    <Route path="/articles" element={<Articles />} />
                    <Route path="/articles/:id" element={<ArticleDetail />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
