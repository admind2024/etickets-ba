import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Send,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Building2,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import SEO from "@/components/SEO";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  orderNumber: string;
  message: string;
  agreePrivacy: boolean;
}

const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  subject: "",
  orderNumber: "",
  message: "",
  agreePrivacy: false,
};

const ContactPage = () => {
  const { lang } = useParams<{ lang?: string }>();
  const currentLang = lang === "en" ? lang : "bs";

  // All translations
  const content: Record<
    string,
    {
      seoTitle: string;
      seoDescription: string;
      heroBadge: string;
      heroTitle: string;
      heroSubtitle: string;
      formTitle: string;
      formSubtitle: string;
      successTitle: string;
      successMessage: string;
      ticketLabel: string;
      firstName: string;
      firstNamePlaceholder: string;
      lastName: string;
      lastNamePlaceholder: string;
      email: string;
      emailPlaceholder: string;
      subject: string;
      orderNumber: string;
      orderNumberPlaceholder: string;
      orderNumberOptional: string;
      message: string;
      messagePlaceholder: string;
      privacyAgree: string;
      privacyPolicy: string;
      privacyAnd: string;
      submitButton: string;
      submitting: string;
      secureNote: string;
      locationTitle: string;
      country: string;
      contactDetails: string;
      emailLabel: string;
      workingHours: string;
      workingHoursValue: string;
      responseTime: string;
      responseTimeValue: string;
      subjectOptions: { value: string; label: string }[];
      errors: {
        firstName: string;
        lastName: string;
        email: string;
        emailInvalid: string;
        subject: string;
        message: string;
        messageMin: string;
        privacy: string;
      };
    }
  > = {
    bs: {
      seoTitle: "Kontakt | e-tickets",
      seoDescription: "Kontaktirajte e-tickets tim za sva pitanja o kupovini ulaznica. Naš tim je spreman da vam pomogne.",
      heroBadge: "Tu smo za vas",
      heroTitle: "Kontaktirajte nas",
      heroSubtitle: "Imate pitanje ili trebate pomoć? Naš tim je spreman da vam pomogne.",
      formTitle: "Pošaljite nam poruku",
      formSubtitle: "Popunite obrazac ispod i javićemo vam se u najkraćem roku.",
      successTitle: "Poruka uspješno poslana!",
      successMessage: "Primićete automatsku potvrdu na email. Odgovorićemo vam u roku od 48 sati.",
      ticketLabel: "Broj zahtjeva:",
      firstName: "Ime",
      firstNamePlaceholder: "Vaše ime",
      lastName: "Prezime",
      lastNamePlaceholder: "Vaše prezime",
      email: "Email",
      emailPlaceholder: "vas@email.com",
      subject: "Tema",
      orderNumber: "Broj narudžbe",
      orderNumberPlaceholder: "npr. pi_3QX...",
      orderNumberOptional: "(opciono)",
      message: "Poruka",
      messagePlaceholder: "Opišite detaljno vaš upit ili problem...",
      privacyAgree: "Slažem se sa",
      privacyPolicy: "Politikom privatnosti",
      privacyAnd: "i obradom mojih podataka",
      submitButton: "Pošalji poruku",
      submitting: "Slanje...",
      secureNote: "🔒 Vaši podaci su sigurni i koristimo ih samo za odgovor na vaš upit.",
      locationTitle: "Naša lokacija",
      country: "Bosna i Hercegovina",
      contactDetails: "Kontakt podaci",
      emailLabel: "Email",
      workingHours: "Radno vrijeme",
      workingHoursValue: "Pon - Pet: 09:00 - 17:00",
      responseTime: "📧 Odgovaramo u roku od 48h",
      responseTimeValue: "Na sve upite odgovaramo najkasnije u roku od dva radna dana.",
      subjectOptions: [
        { value: "", label: "Izaberite temu" },
        { value: "purchase", label: "Pitanje o kupovini" },
        { value: "tickets", label: "Problem sa kartama" },
        { value: "refund", label: "Povrat novca" },
        { value: "event", label: "Informacije o događaju" },
        { value: "technical", label: "Tehnički problem" },
        { value: "partnership", label: "Partnerstvo / Saradnja" },
        { value: "other", label: "Ostalo" },
      ],
      errors: {
        firstName: "Ime je obavezno",
        lastName: "Prezime je obavezno",
        email: "Email je obavezan",
        emailInvalid: "Unesite validnu email adresu",
        subject: "Izaberite temu poruke",
        message: "Poruka je obavezna",
        messageMin: "Poruka mora imati najmanje 10 karaktera",
        privacy: "Morate prihvatiti politiku privatnosti",
      },
    },
    en: {
      seoTitle: "Contact | e-tickets",
      seoDescription: "Contact e-tickets team for all questions about ticket purchases. Our team is ready to help you.",
      heroBadge: "We're here for you",
      heroTitle: "Contact Us",
      heroSubtitle: "Have a question or need help? Our team is ready to assist you.",
      formTitle: "Send us a message",
      formSubtitle: "Fill out the form below and we'll get back to you as soon as possible.",
      successTitle: "Message sent successfully!",
      successMessage: "You will receive an automatic confirmation by email. We will respond within 48 hours.",
      ticketLabel: "Ticket number:",
      firstName: "First Name",
      firstNamePlaceholder: "Your first name",
      lastName: "Last Name",
      lastNamePlaceholder: "Your last name",
      email: "Email",
      emailPlaceholder: "you@email.com",
      subject: "Subject",
      orderNumber: "Order Number",
      orderNumberPlaceholder: "e.g. pi_3QX...",
      orderNumberOptional: "(optional)",
      message: "Message",
      messagePlaceholder: "Describe your question or issue in detail...",
      privacyAgree: "I agree to the",
      privacyPolicy: "Privacy Policy",
      privacyAnd: "and processing of my data",
      submitButton: "Send Message",
      submitting: "Sending...",
      secureNote: "🔒 Your data is secure and we only use it to respond to your inquiry.",
      locationTitle: "Our Location",
      country: "Bosnia and Herzegovina",
      contactDetails: "Contact Details",
      emailLabel: "Email",
      workingHours: "Working Hours",
      workingHoursValue: "Mon - Fri: 09:00 - 17:00",
      responseTime: "📧 We respond within 48 hours",
      responseTimeValue: "We respond to all inquiries within two business days.",
      subjectOptions: [
        { value: "", label: "Select a topic" },
        { value: "purchase", label: "Purchase question" },
        { value: "tickets", label: "Ticket issue" },
        { value: "refund", label: "Refund request" },
        { value: "event", label: "Event information" },
        { value: "technical", label: "Technical problem" },
        { value: "partnership", label: "Partnership / Collaboration" },
        { value: "other", label: "Other" },
      ],
      errors: {
        firstName: "First name is required",
        lastName: "Last name is required",
        email: "Email is required",
        emailInvalid: "Please enter a valid email address",
        subject: "Please select a topic",
        message: "Message is required",
        messageMin: "Message must be at least 10 characters",
        privacy: "You must accept the privacy policy",
      },
    },
  };

  const t = content[currentLang] || content.bs;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.firstName.trim()) errors.push(t.errors.firstName);
    if (!formData.lastName.trim()) errors.push(t.errors.lastName);
    if (!formData.email.trim()) errors.push(t.errors.email);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push(t.errors.emailInvalid);
    }
    if (!formData.subject) errors.push(t.errors.subject);
    if (!formData.message.trim()) errors.push(t.errors.message);
    else if (formData.message.trim().length < 10) {
      errors.push(t.errors.messageMin);
    }
    if (!formData.agreePrivacy) errors.push(t.errors.privacy);

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      setErrorMessage(errors.join(". "));
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus("idle"), 5000);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("send-support-request", {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          subject: formData.subject,
          orderNumber: formData.orderNumber || null,
          message: formData.message,
        },
      });

      if (error) {
        throw new Error(error.message || "Error sending request");
      }

      if (data?.success) {
        setTicketId(data.ticketId);
        setSubmitStatus("success");
        setFormData(initialFormData);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        throw new Error(data?.message || "Error sending request");
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      setErrorMessage(error.message || "Error sending. Please try again.");
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapUrl =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2944.123!2d18.944!3d42.773!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x134deb3c9c0d5e5d%3A0x4b8e8e8e8e8e8e8e!2sSerdara%20%C5%A0%C4%87epana%204%2C%20Nik%C5%A1i%C4%87%2081400!5e0!3m2!1sen!2sme!4v1704067200000!5m2!1sen!2sme";

  const privacyLink = currentLang === "bs" ? "/politika-privatnosti" : `/politika-privatnosti/${currentLang}`;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={t.seoTitle} description={t.seoDescription} type="website" basePath="/kontakt" />
      <Header />

      {/* Hero Section */}
      <section className="relative py-12 md:py-20 gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <MessageSquare className="w-4 h-4" />
              {t.heroBadge}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">{t.heroTitle}</h1>
            <p className="text-lg text-muted-foreground">{t.heroSubtitle}</p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="gradient-card rounded-2xl border border-border p-6 md:p-8 shadow-card">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t.formTitle}</h2>
                  <p className="text-muted-foreground">{t.formSubtitle}</p>
                </div>

                {/* Success Message */}
                {submitStatus === "success" && (
                  <div className="mb-6 p-6 rounded-xl bg-green-500/10 border border-green-500/30">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-500 mb-1">{t.successTitle}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{t.successMessage}</p>
                        {ticketId && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20">
                            <span className="text-sm text-green-500">{t.ticketLabel}</span>
                            <span className="text-sm font-bold text-green-500">{ticketId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {submitStatus === "error" && errorMessage && (
                  <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Row */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                        {t.firstName} <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder={t.firstNamePlaceholder}
                      />
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                        {t.lastName} <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder={t.lastNamePlaceholder}
                      />
                    </div>
                  </div>

                  {/* Email Row */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      {t.email} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder={t.emailPlaceholder}
                    />
                  </div>

                  {/* Subject & Order Row */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                        {t.subject} <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                        >
                          {t.subjectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="orderNumber" className="block text-sm font-medium text-foreground mb-2">
                        {t.orderNumber} <span className="text-muted-foreground text-xs">{t.orderNumberOptional}</span>
                      </label>
                      <input
                        type="text"
                        id="orderNumber"
                        name="orderNumber"
                        value={formData.orderNumber}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder={t.orderNumberPlaceholder}
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                      {t.message} <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border-2 border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      placeholder={t.messagePlaceholder}
                    />
                  </div>

                  {/* Privacy Checkbox */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="agreePrivacy"
                      name="agreePrivacy"
                      checked={formData.agreePrivacy}
                      onChange={handleInputChange}
                      className="w-5 h-5 mt-0.5 rounded border-input text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="agreePrivacy" className="text-sm text-muted-foreground cursor-pointer">
                      {t.privacyAgree}{" "}
                      <Link to={privacyLink} className="text-primary font-medium hover:underline">
                        {t.privacyPolicy}
                      </Link>{" "}
                      {t.privacyAnd} <span className="text-destructive">*</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 gradient-primary text-primary-foreground font-semibold rounded-xl shadow-glow hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t.submitting}
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        {t.submitButton}
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-muted-foreground">{t.secureNote}</p>
                </form>
              </div>
            </div>

            {/* Contact Info & Map */}
            <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
              {/* Location Card */}
              <div className="gradient-card rounded-2xl border border-border p-6 shadow-card">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {t.locationTitle}
                </h2>

                <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{t.country}</p>
                      <p className="text-sm text-muted-foreground">
                        Serdara Šćepana 4<br />
                        Nikšić, 81400
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Map */}
              <div className="gradient-card rounded-2xl border border-border overflow-hidden shadow-card">
                <div className="aspect-[4/3] w-full">
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Map - Nikšić"
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Contact Details */}
              <div className="gradient-card rounded-2xl border border-border p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">{t.contactDetails}</h3>

                <div className="space-y-4">
                  <a
                    href="mailto:support@e-tickets.me"
                    className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Mail className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t.emailLabel}</p>
                      <p className="font-medium text-foreground">support@e-tickets.me</p>
                    </div>
                  </a>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t.workingHours}</p>
                      <p className="font-medium text-foreground">{t.workingHoursValue}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{t.responseTime}</span>
                    <br />
                    <span className="text-muted-foreground">{t.responseTimeValue}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
