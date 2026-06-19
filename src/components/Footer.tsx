import { Link } from "react-router-dom";
import { Globe, Instagram, Facebook, Youtube, Twitter } from "lucide-react";

const socialLinks = [
  { icon: Globe, href: "https://www.agms-gallery.com", label: "Website" },
  { icon: Instagram, href: "https://instagram.com/agmsgallery", label: "Instagram" },
  { icon: Facebook, href: "https://facebook.com/agmsgallery", label: "Facebook" },
  { icon: Twitter, href: "https://x.com/agmsgallery", label: "X (Twitter)" },
  { icon: Youtube, href: "https://youtube.com/@agmsgallery", label: "YouTube" },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-gradient-gold">AGMS</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Art Gallery Management & Marketing System — connecting artists, collectors, and galleries worldwide.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">Explore</h4>
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/gallery" className="text-sm text-muted-foreground hover:text-primary transition-colors">Gallery</Link>
              <Link to="/artists" className="text-sm text-muted-foreground hover:text-primary transition-colors">Artists</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">Contact</h4>
            <p className="mt-3 text-sm text-muted-foreground">info@agms-gallery.com</p>
            <a
              href="https://www.agms-gallery.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              www.agms-gallery.com
            </a>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © 2025 AGMS. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
