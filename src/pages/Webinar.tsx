import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Users, Radio,
  Settings, PhoneOff, UserPlus,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { VideoTile } from "@/components/webinar/VideoTile";
import { useLocalMedia } from "@/hooks/useLocalMedia";
import WebinarChat from "@/components/webinar/WebinarChat";

type Source = {
  id: string;
  name: string;
  color: string;
  isLocal?: boolean;
  isHost?: boolean;
};

// Live host + already-joined participants only.
const HOST: Source = {
  id: "host",
  name: "Host (You)",
  color: "from-amber-700 to-amber-900",
  isLocal: true,
  isHost: true,
};

const JOINED: Source[] = [
  { id: "p1", name: "Lydia Ekstrom", color: "from-rose-700 to-rose-900" },
  { id: "p2", name: "Cooper Frantz", color: "from-sky-700 to-sky-900" },
  { id: "p3", name: "Corey Schleier", color: "from-fuchsia-700 to-fuchsia-900" },
  { id: "p4", name: "David Diaz", color: "from-teal-700 to-teal-900" },
];

const DEFAULT_STREAM_ID = "00000000-0000-0000-0000-00000000beef";

export default function Webinar() {
  const [params] = useSearchParams();
  const streamId = params.get("stream") || DEFAULT_STREAM_ID;
  const isHost = params.get("host") !== "0";

  const local = useLocalMedia();
  const participants = useMemo(() => [HOST, ...JOINED], []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Live Session</h1>
            <p className="text-sm text-muted-foreground">
              Stream {streamId.slice(0, 8)} · {participants.length} in room
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!local.active ? (
              <Button size="sm" onClick={local.start}>
                <UserPlus className="w-4 h-4 mr-1" />
                Join with Camera
              </Button>
            ) : (
              <>
                <Button
                  variant={local.audioOn ? "outline" : "destructive"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={local.toggleAudio}
                  aria-label={local.audioOn ? "Mute microphone" : "Unmute microphone"}
                >
                  {local.audioOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
                <Button
                  variant={local.videoOn ? "outline" : "destructive"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={local.toggleVideo}
                  aria-label={local.videoOn ? "Turn camera off" : "Turn camera on"}
                >
                  {local.videoOn ? <VideoIcon className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={local.stop}>
                  Leave
                </Button>
              </>
            )}
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Settings">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="sm">
              <PhoneOff className="w-4 h-4 mr-1" />
              End
            </Button>
          </div>
        </div>

        {local.error && (
          <p className="text-xs text-destructive mb-3">
            Camera error: {local.error}
          </p>
        )}

        <div className="grid grid-cols-12 gap-4">
          {/* Live host (hero) + joined participants */}
          <div className="col-span-12 md:col-span-9 space-y-4">
            <Card className="p-3 bg-card border-destructive/40">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-destructive text-destructive-foreground text-xs gap-1">
                  <Radio className="w-3 h-3" />
                  ON AIR · Host
                </Badge>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
              <div className="aspect-video rounded-md overflow-hidden relative">
                <VideoTile
                  stream={local.active ? local.stream : null}
                  fallbackGradient={HOST.color}
                  name={HOST.name}
                  showLive
                  className="absolute inset-0"
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-sm font-semibold">{HOST.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    Broadcasting
                  </p>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Participants">
                  <Users className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>

            <Card className="p-3 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Joined participants</h3>
                  <span className="text-xs text-muted-foreground">
                    {JOINED.length} viewer{JOINED.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" role="list" aria-label="Joined participants">
                {JOINED.map((s) => (
                  <div key={s.id} role="listitem">
                    <VideoTile
                      stream={null}
                      fallbackGradient={s.color}
                      name={s.name}
                      className="aspect-video"
                      focusable
                      ariaLabel={`Participant ${s.name}`}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Chat */}
          <div className="col-span-12 md:col-span-3">
            <WebinarChat streamId={streamId} isHost={isHost} />
          </div>
        </div>
      </div>
    </div>
  );
}
