import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const pathname = location.pathname;

  // Determine current language from URL
  let currentLang = "bs";
  if (pathname === "/en" || pathname.endsWith("/en")) {
    currentLang = "en";
  }

  const content: Record<
    string,
    {
      title: string;
      titleHighlight: string;
      description: string;
      placeholder: string;
      button: string;
      submitting: string;
      disclaimer: string;
      errorTitle: string;
      errorMessage: string;
      successTitle: string;
      successMessage: string;
    }
  > = {
    bs: {
      title: "Prijavite se na",
      titleHighlight: "Newsletter",
      description:
        "Budite u toku sa najnovijim najavama turneja i nadolazećim događajima. Nikada nećete propustiti događaj koji vas zanima!",
      placeholder: "Unesite vašu email adresu",
      button: "Prijavi se",
      submitting: "Šaljem...",
      disclaimer:
        "Želim da se pretplatim na etickets newsletter. U svakom trenutku mogu da se odjavim sa newslettera.",
      errorTitle: "Greška",
      errorMessage: "Molimo unesite email adresu.",
      successTitle: "Uspješno!",
      successMessage: "Uspješno ste se prijavili na newsletter.",
    },
    en: {
      title: "Subscribe to our",
      titleHighlight: "Newsletter",
      description:
        "Stay up to date with the latest tour announcements and upcoming events. You'll never miss an event you're interested in!",
      placeholder: "Enter your email address",
      button: "Subscribe",
      submitting: "Sending...",
      disclaimer: "I want to subscribe to the etickets newsletter. I can unsubscribe at any time.",
      errorTitle: "Error",
      errorMessage: "Please enter an email address.",
      successTitle: "Success!",
      successMessage: "You have successfully subscribed to the newsletter.",
    },
  };

  const t = content[currentLang] || content.bs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: t.errorTitle,
        description: t.errorMessage,
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
      title: t.successTitle,
      description: t.successMessage,
    });
    setEmail("");
    setIsSubmitting(false);
  };

  return (
    <section className="py-20 gradient-hero">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow animate-pulse-glow">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t.title} <span className="text-gradient">{t.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground mb-8">{t.description}</p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="email"
              placeholder={t.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-12 bg-secondary border-border focus:border-primary"
            />
            <Button type="submit" variant="hero" size="lg" disabled={isSubmitting} className="px-8">
              {isSubmitting ? t.submitting : t.button}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4">{t.disclaimer}</p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
