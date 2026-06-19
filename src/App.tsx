import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { initPushNotifications } from "@/lib/pushNotifications";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Gallery from "./pages/Gallery";
import ArtworkDetail from "./pages/ArtworkDetail";
import Artists from "./pages/Artists";
import ArtistProfile from "./pages/ArtistProfile";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import ProfilePage from "./pages/ProfilePage";
import SubmitArtwork from "./pages/SubmitArtwork";
import Sell from "./pages/Sell";
import ResetPassword from "./pages/ResetPassword";
import ArtistDashboard from "./pages/ArtistDashboard";
import Payment from "./pages/Payment";
import CreateProfile from "./pages/CreateProfile";
import Messages from "./pages/Messages";
import ArtDetection from "./pages/ArtDetection";
import Webinar from "./pages/Webinar";
import Live from "./pages/Live";
import LiveStream from "./pages/LiveStream";
import LiveEnded from "./pages/LiveEnded";
import AdminLiveModeration from "./pages/AdminLiveModeration";
import NotFound from "./pages/NotFound";
import Exhibitions from "./pages/Exhibitions";
import AdminAuditLog from "./pages/AdminAuditLog";
import BecomeArtist from "./pages/BecomeArtist";
import RequestArtwork from "./pages/RequestArtwork";
import MyArtworkRequests from "./pages/MyArtworkRequests";
import AdminArtworkRequests from "./pages/AdminArtworkRequests";
import AdminTutorial from "./pages/AdminTutorial";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initPushNotifications();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
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
              <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
              <Route path="/submit" element={<ProtectedRoute><SubmitArtwork /></ProtectedRoute>} />
              <Route path="/create-profile" element={<ProtectedRoute><CreateProfile /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><ArtistDashboard /></ProtectedRoute>} />
              <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/art-detection" element={<ProtectedRoute><ArtDetection /></ProtectedRoute>} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
