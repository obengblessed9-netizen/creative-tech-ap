import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, ShieldCheck, VolumeX, Volume2, Trash2, Timer } from "lucide-react";
import { toast } from "sonner";

type ChatMessage = {
  id: string;
  stream_id: string;
  user_id: string;
  message: string;
  created_at: string;
};

interface Props {
  streamId: string;
  isHost: boolean;
}

export default function WebinarChat({ streamId, isHost }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [slowMode, setSlowMode] = useState(false);
  const [lastSent, setLastSent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("live_chat_messages")
        .select("*")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (mounted && data) setMessages(data as ChatMessage[]);
    })();

    const channel = supabase
      .channel(`chat:${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !userId) {
      if (!userId) toast.error("Sign in to chat");
      return;
    }
    if (slowMode && Date.now() - lastSent < 5000) {
      toast.error("Slow mode: wait 5s between messages");
      return;
    }
    const text = input.trim();
    setInput("");
    setLastSent(Date.now());
    const { error } = await supabase.from("live_chat_messages").insert({
      stream_id: streamId,
      user_id: userId,
      message: text,
    });
    if (error) {
      toast.error(error.message);
      setInput(text);
    }
  };

  const toggleMute = (uid: string) => {
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const clearLocal = () => setMessages([]);

  const visible = messages.filter((m) => !muted.has(m.user_id));

  return (
    <Card className="bg-card flex flex-col h-[520px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Live Chat</h3>
          <Badge variant="secondary" className="text-[10px]">
            {visible.length}
          </Badge>
        </div>
        {isHost && (
          <div className="flex items-center gap-1">
            <Badge className="text-[10px] gap-1 bg-primary/20 text-primary border border-primary/40">
              <ShieldCheck className="w-3 h-3" /> Host
            </Badge>
            <Button
              variant={slowMode ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setSlowMode((s) => !s)}
              title="Toggle slow mode (5s)"
            >
              <Timer className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearLocal}
              title="Clear chat (local)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No messages yet. Say hi!
          </p>
        ) : (
          visible.map((m) => (
            <div key={m.id} className="group flex items-start gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground">
                  {m.user_id.slice(0, 8)} ·{" "}
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-foreground break-words">{m.message}</p>
              </div>
              {isHost && m.user_id !== userId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => toggleMute(m.user_id)}
                  title={muted.has(m.user_id) ? "Unmute" : "Mute user"}
                >
                  {muted.has(m.user_id) ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={slowMode ? "Slow mode on…" : "Type a message"}
          className="text-sm"
        />
        <Button size="icon" onClick={send}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
