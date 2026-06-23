import { useEffect, lazy, Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { initPushNotifications } from "@/lib/pushNotifications";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const Gallery = lazy(() => import("./pages/Gallery"));
const ArtworkDetail = lazy(() => import("./pages/ArtworkDetail"));
const Artists = lazy(() => import("./pages/Artists"));
const ArtistProfile = lazy(() => import("./pages/ArtistProfile"));
const Auth = lazy(() => import("./pages/Auth"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SubmitArtwork = lazy(() => import("./pages/SubmitArtwork"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ArtistDashboard = lazy(() => import("./pages/ArtistDashboard"));
const Payment = lazy(() => import("./pages/Payment"));
const CreateProfile = lazy(() => import("./pages/CreateProfile"));
const Messages = lazy(() => import("./pages/Messages"));
const Webinar = lazy(() => import("./pages/Webinar"));
const Live = lazy(() => import("./pages/Live"));
const LiveStream = lazy(() => import("./pages/LiveStream"));
const LiveEnded = lazy(() => import("./pages/LiveEnded"));
const AdminLiveModeration = lazy(() => import("./pages/AdminLiveModeration"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Exhibitions = lazy(() => import("./pages/Exhibitions"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));
const BecomeArtist = lazy(() => import("./pages/BecomeArtist"));
const RequestArtwork = lazy(() => import("./pages/RequestArtwork"));
const MyArtworkRequests = lazy(() => import("./pages/MyArtworkRequests"));
const AdminArtworkRequests = lazy(() => import("./pages/AdminArtworkRequests"));
const AdminTutorial = lazy(() => import("./pages/AdminTutorial"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));

const queryClient = new QueryClient();

const FallbackLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="text-sm font-medium text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    initPushNotifications();
  }, []);

  return (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>
                <Suspense fallback={<FallbackLoader />}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
                    <Route path="/artwork/:id" element={<ProtectedRoute><ArtworkDetail /></ProtectedRoute>} />
                    <Route path="/artists" element={<ProtectedRoute><Artists /></ProtectedRoute>} />
                    <Route path="/artist/:id" element={<ProtectedRoute><ArtistProfile /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/submit" element={<ProtectedRoute><SubmitArtwork /></ProtectedRoute>} />
                    <Route path="/create-profile" element={<ProtectedRoute><CreateProfile /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><ArtistDashboard /></ProtectedRoute>} />
                    <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                    <Route path="/webinar" element={<ProtectedRoute><Webinar /></ProtectedRoute>} />
                    <Route path="/live" element={<ProtectedRoute><Live /></ProtectedRoute>} />
                    <Route path="/live/ended" element={<ProtectedRoute><LiveEnded /></ProtectedRoute>} />
                    <Route path="/live/:id" element={<ProtectedRoute><LiveStream /></ProtectedRoute>} />
                    <Route path="/admin/live-moderation" element={<ProtectedRoute><AdminLiveModeration /></ProtectedRoute>} />
                    <Route path="/exhibitions" element={<ProtectedRoute><Exhibitions /></ProtectedRoute>} />
                    <Route path="/admin/audit-log" element={<ProtectedRoute><AdminAuditLog /></ProtectedRoute>} />
                    <Route path="/become-artist" element={<ProtectedRoute><BecomeArtist /></ProtectedRoute>} />
                    <Route path="/request-artwork" element={<ProtectedRoute><RequestArtwork /></ProtectedRoute>} />
                    <Route path="/my-requests" element={<ProtectedRoute><MyArtworkRequests /></ProtectedRoute>} />
                    <Route path="/admin/artwork-requests" element={<ProtectedRoute><AdminArtworkRequests /></ProtectedRoute>} />
                    <Route path="/admin/tutorial" element={<ProtectedRoute><AdminTutorial /></ProtectedRoute>} />
                    <Route path="/order/:id" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </FavoritesProvider>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
