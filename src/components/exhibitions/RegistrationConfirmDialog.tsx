import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, MapPin } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  details: {
    title: string;
    starts_at: string;
    location: string | null;
    name: string | null;
    email: string | null;
    confirmation: string;
  } | null;
}

export const RegistrationConfirmDialog = ({ open, onClose, details }: Props) => {
  if (!details) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">You're registered!</DialogTitle>
          <DialogDescription className="text-center">
            Your spot for <strong className="text-foreground">{details.title}</strong> is confirmed.
            We've recorded your registration — please save the details below.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-2 text-sm">
          <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{new Date(details.starts_at).toLocaleString()}</p>
          {details.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{details.location}</p>}
          <div className="border-t border-border pt-2 mt-2">
            <p className="text-xs text-muted-foreground">Registered as</p>
            <p className="text-foreground">{details.name || "—"}</p>
            <p className="text-xs text-muted-foreground">{details.email}</p>
          </div>
          <div className="border-t border-border pt-2">
            <p className="text-xs text-muted-foreground">Confirmation #</p>
            <p className="font-mono text-xs text-foreground">{details.confirmation}</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="w-full bg-gradient-gold text-primary-foreground">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
