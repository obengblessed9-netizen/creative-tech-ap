import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Mail, Send, ArrowLeft, CheckCheck, CalendarDays, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  content: string;
  read: boolean;
  created_at: string;
  artwork_id: string | null;
  sender_profile?: { display_name: string | null } | null;
  recipient_profile?: { display_name: string | null } | null;
}

type Tab = "inbox" | "sent";

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchMessages();
  }, [user, tab]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);

    const query = tab === "inbox"
      ? supabase.from("messages").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false })
      : supabase.from("messages").select("*").eq("sender_id", user.id).order("created_at", { ascending: false });

    const { data } = await query;

    if (data) {
      const userIds = [...new Set(data.flatMap(m => [m.sender_id, m.recipient_id]))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setMessages(data.map(m => ({
        ...m,
        sender_profile: profileMap.get(m.sender_id) || null,
        recipient_profile: profileMap.get(m.recipient_id) || null,
      })));
    }
    setLoading(false);
  };

  const markAsRead = async (msg: Message) => {
    if (tab === "inbox" && !msg.read) {
      await supabase.from("messages").update({ read: true }).eq("id", msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
    }
    setSelectedMessage(msg);
  };

  const handleReply = async () => {
    if (!user || !selectedMessage || !replyContent.trim()) return;
    setSending(true);
    const recipientId = selectedMessage.sender_id === user.id
      ? selectedMessage.recipient_id
      : selectedMessage.sender_id;

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: recipientId,
      subject: `Re: ${selectedMessage.subject || "No subject"}`,
      content: replyContent.trim(),
      artwork_id: selectedMessage.artwork_id,
    });

    if (error) toast.error("Failed to send reply");
    else {
      toast.success("Reply sent!");
      setReplyContent("");
      fetchMessages();
    }
    setSending(false);
  };

  const unreadCount = messages.filter(m => !m.read && tab === "inbox").length;
  const isExhibitionBooking = (msg: Message) =>
    msg.subject?.toLowerCase().includes("exhibition");

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="h-6 w-6 text-primary" />
            <h1 className="font-display text-3xl font-bold text-foreground">Messages</h1>
            {unreadCount > 0 && tab === "inbox" && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setTab("inbox"); setSelectedMessage(null); }}
              className={`flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-all ${
                tab === "inbox" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              <Mail className="h-4 w-4" /> Inbox
            </button>
            <button
              onClick={() => { setTab("sent"); setSelectedMessage(null); }}
              className={`flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-all ${
                tab === "sent" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              <Send className="h-4 w-4" /> Sent
            </button>
          </div>

          {selectedMessage ? (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)} className="text-muted-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to {tab}
              </Button>

              <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {isExhibitionBooking(selectedMessage) && (
                        <CalendarDays className="h-4 w-4 text-primary" />
                      )}
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {selectedMessage.subject || "No subject"}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tab === "inbox" ? "From" : "To"}:{" "}
                      <span className="text-foreground">
                        {tab === "inbox"
                          ? selectedMessage.sender_profile?.display_name || "Unknown"
                          : selectedMessage.recipient_profile?.display_name || "Unknown"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </p>
                  </div>
                  {selectedMessage.read && tab === "inbox" && (
                    <CheckCheck className="h-4 w-4 text-primary" />
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                    {selectedMessage.content}
                  </p>
                </div>
              </div>

              {/* Reply */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Reply</h4>
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  rows={3}
                />
                <Button
                  onClick={handleReply}
                  disabled={sending || !replyContent.trim()}
                  size="sm"
                  className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
                >
                  <Send className="mr-1 h-3 w-3" /> {sending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {loading ? (
                <p className="text-center text-muted-foreground py-10">Loading messages...</p>
              ) : messages.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-12 text-center">
                  <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-muted-foreground">No messages in your {tab}.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => markAsRead(msg)}
                    className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-secondary/50 ${
                      !msg.read && tab === "inbox"
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-secondary text-xs text-foreground">
                          {(tab === "inbox"
                            ? msg.sender_profile?.display_name || "U"
                            : msg.recipient_profile?.display_name || "U"
                          ).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isExhibitionBooking(msg) && (
                            <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                          <p className={`text-sm truncate ${!msg.read && tab === "inbox" ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                            {msg.subject || "No subject"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {tab === "inbox" ? "From" : "To"}: {tab === "inbox" ? msg.sender_profile?.display_name || "Unknown" : msg.recipient_profile?.display_name || "Unknown"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </p>
                        {!msg.read && tab === "inbox" && (
                          <span className="inline-block h-2 w-2 rounded-full bg-primary mt-1" />
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;