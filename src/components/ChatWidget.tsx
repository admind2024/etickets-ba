import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Ticket, RotateCcw, Download, Search, User, Mail, Phone, ExternalLink, MapPin, ShoppingCart } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  quickReplies?: { number: string; text: string }[];
  showForm?: boolean;
}

interface TicketFormData {
  event: string;
  name: string;
  email: string;
  phone: string;
}

const WELCOME_MESSAGE = `Zdravo! 👋 Kako vam mogu pomoći?`;

const WELCOME_OPTIONS = [
  { number: "1", text: "Nisam dobio/la karte" },
  { number: "2", text: "Kako kupiti kartu" },
  { number: "3", text: "Povrat novca" },
  { number: "4", text: "Nešto drugo" },
];

// Izvuci KRATKE meni opcije iz poruke (ne duge instrukcije/korake)
const extractQuickReplies = (content: string): { number: string; text: string }[] => {
  const replies: { number: string; text: string }[] = [];

  const emojiPattern = /([1-9])️⃣\s*([^\n1-9️⃣]+)/g;
  let match;
  while ((match = emojiPattern.exec(content)) !== null) {
    const text = match[2].trim();
    // Samo kratke opcije su meni (npr. "Kako kupiti kartu", "Povrat novca")
    // Duge opcije sa opisima su instrukcije (npr. "**Izaberite događaj** - Pregledajte listu...")
    if (text.length <= 40 && !text.includes(" - ")) {
      replies.push({ number: match[1], text });
    }
  }

  return replies;
};

// Ukloni opcije iz teksta - samo kratke meni opcije (ne instrukcije)
const removeOptionsFromText = (content: string): string => {
  const cleaned = content.replace(/[1-9]️⃣\s*([^\n]{1,40})(?!\s*-)\n?/g, (fullMatch, text) => {
    // Zadrži duge opcije i opcije sa " - " (to su instrukcije)
    if (text.trim().length > 40 || text.includes(" - ")) return fullMatch;
    return "";
  });
  return cleaned.trim();
};

// Renderuj inline markdown (bold, italic)
const renderFormattedText = (text: string, keyPrefix: string) => {
  const elements: React.ReactNode[] = [];
  // Split po **bold** i *italic*
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIdx = 0;
  let m;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      elements.push(text.substring(lastIdx, m.index));
    }
    if (m[2]) {
      // **bold**
      elements.push(<strong key={`${keyPrefix}-b-${m.index}`} className="font-semibold">{m[2]}</strong>);
    } else if (m[3]) {
      // *italic*
      elements.push(<em key={`${keyPrefix}-i-${m.index}`}>{m[3]}</em>);
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    elements.push(text.substring(lastIdx));
  }
  return elements.length > 0 ? elements : [text];
};

// Renderuj blok teksta sa listama i paragrafima
const renderTextBlock = (text: string, keyPrefix: string) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-ul-${elements.length}`} className="my-1.5 space-y-1">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    // Bullet point: - item ili • item
    const bulletMatch = trimmed.match(/^[-•]\s+(.+)/);
    if (bulletMatch) {
      currentList.push(
        <li key={`${keyPrefix}-li-${lineIdx}`} className="flex items-start gap-2 text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
          <span>{renderFormattedText(bulletMatch[1], `${keyPrefix}-li-${lineIdx}`)}</span>
        </li>
      );
      return;
    }

    // Emoji bullet (📅, 📍, 💰, 🎤, ℹ️, 🔗 etc.)
    const emojiBulletMatch = trimmed.match(/^([\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{2702}-\u{27B0}\u{E000}-\u{F8FF}ℹ️]+)\s*(.+)/u);
    if (emojiBulletMatch) {
      flushList();
      elements.push(
        <div key={`${keyPrefix}-emoji-${lineIdx}`} className="flex items-start gap-2 py-0.5 text-sm">
          <span className="flex-shrink-0">{emojiBulletMatch[1]}</span>
          <span>{renderFormattedText(emojiBulletMatch[2], `${keyPrefix}-emoji-${lineIdx}`)}</span>
        </div>
      );
      return;
    }

    flushList();
    elements.push(
      <p key={`${keyPrefix}-p-${lineIdx}`} className="py-0.5">
        {renderFormattedText(trimmed, `${keyPrefix}-p-${lineIdx}`)}
      </p>
    );
  });

  flushList();
  return elements;
};

// Tip linka
type LinkType = "ticket" | "purchase" | "info" | "maps" | "email" | "generic";

const getLinkType = (url: string): LinkType => {
  if (url.startsWith("mailto:")) return "email";
  if (url.includes("etiketing.me/tickets?sessionId=")) return "ticket";
  if (url.includes("etiketing.me/povrat") || url.includes("etiketing.me/osiguranje") || url.includes("etiketing.me/faq") || url.includes("etiketing.me/kontakt")) return "info";
  if (url.includes("etiketing.me/") || url.includes("e-tickets.me")) return "purchase";
  if (url.includes("google.com/maps") || url.includes("goo.gl/maps") || url.includes("maps.google")) return "maps";
  return "generic";
};

const linkConfig: Record<LinkType, { icon: typeof Ticket; label: string; sublabel: string; gradient: string; hoverGradient: string }> = {
  ticket: { icon: Ticket, label: "Preuzmi karte", sublabel: "Klikni za pregled", gradient: "from-blue-600 via-blue-600 to-indigo-600", hoverGradient: "hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700" },
  purchase: { icon: ShoppingCart, label: "Kupi karte", sublabel: "Otvori stranicu", gradient: "from-emerald-600 to-teal-600", hoverGradient: "hover:from-emerald-700 hover:to-teal-700" },
  info: { icon: ExternalLink, label: "Više informacija", sublabel: "Otvori stranicu", gradient: "from-blue-500 to-indigo-500", hoverGradient: "hover:from-blue-600 hover:to-indigo-600" },
  maps: { icon: MapPin, label: "Prikaži lokaciju", sublabel: "Google Maps", gradient: "from-orange-500 to-red-500", hoverGradient: "hover:from-orange-600 hover:to-red-600" },
  email: { icon: Mail, label: "Pošalji email", sublabel: "Kontakt podrška", gradient: "from-violet-600 to-purple-600", hoverGradient: "hover:from-violet-700 hover:to-purple-700" },
  generic: { icon: ExternalLink, label: "Otvori link", sublabel: "Klikni za više", gradient: "from-gray-600 to-gray-700", hoverGradient: "hover:from-gray-700 hover:to-gray-800" },
};

// Parsiranje linkova
const parseMessageContent = (content: string) => {
  const parts: (string | { type: "button"; url: string; linkType: LinkType })[] = [];
  let lastIndex = 0;

  const allMatches: { index: number; length: number; url: string }[] = [];
  let match;

  // 1. Markdown linkovi [tekst](url)
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    allMatches.push({ index: match.index, length: match[0].length, url: match[2] });
  }

  // 2. Plain URL-ovi (samo ako nisu već uhvaćeni kao markdown)
  const plainLinkRegex = /(https?:\/\/[^\s,)]+)/g;
  while ((match = plainLinkRegex.exec(content)) !== null) {
    const overlaps = allMatches.some(
      (m) => match!.index >= m.index && match!.index < m.index + m.length
    );
    if (!overlaps) {
      allMatches.push({ index: match.index, length: match[0].length, url: match[1] });
    }
  }

  // 3. Email adrese (support@e-tickets.me itd.)
  const emailRegex = /(?<!\S)([\w.-]+@[\w.-]+\.\w+)(?!\S)/g;
  while ((match = emailRegex.exec(content)) !== null) {
    const overlaps = allMatches.some(
      (m) => match!.index >= m.index && match!.index < m.index + m.length
    );
    if (!overlaps) {
      allMatches.push({ index: match.index, length: match[0].length, url: `mailto:${match[1]}` });
    }
  }

  allMatches.sort((a, b) => a.index - b.index);

  for (const m of allMatches) {
    if (m.index > lastIndex) {
      parts.push(content.substring(lastIndex, m.index));
    }
    parts.push({ type: "button", url: m.url, linkType: getLinkType(m.url) });
    lastIndex = m.index + m.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
};

// Forma za pretragu karata
const TicketSearchForm = ({
  events,
  onSubmit,
  isLoading,
}: {
  events: string[];
  onSubmit: (data: TicketFormData) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState<TicketFormData>({
    event: "",
    name: "",
    email: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.event && formData.name && formData.email && formData.phone) {
      onSubmit(formData);
    }
  };

  const isValid = formData.event && formData.name && formData.email && formData.phone;

  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pronađi moje karte</div>

      {/* Event Select */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Događaj</label>
        <select
          value={formData.event}
          onChange={(e) => setFormData({ ...formData, event: e.target.value })}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          disabled={isLoading}
        >
          <option value="">Izaberite događaj</option>
          {events.map((event, idx) => (
            <option key={idx} value={event}>
              {event}
            </option>
          ))}
        </select>
      </div>

      {/* Name Input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ime i prezime</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Vaše ime i prezime"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none placeholder-gray-400"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Email Input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email adresa</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="vas@email.com"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none placeholder-gray-400"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Phone Input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Broj telefona</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+38269123456"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none placeholder-gray-400"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-md disabled:shadow-none"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Pretražujem...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Pronađi karte
          </>
        )}
      </button>
    </form>
  );
};

const MessageBubble = ({
  content,
  isUser,
  quickReplies,
  onQuickReply,
  showQuickReplies,
  showForm,
  events,
  onFormSubmit,
  isLoading,
}: {
  content: string;
  isUser: boolean;
  quickReplies?: { number: string; text: string }[];
  onQuickReply?: (value: string) => void;
  showQuickReplies?: boolean;
  showForm?: boolean;
  events?: string[];
  onFormSubmit?: (data: TicketFormData) => void;
  isLoading?: boolean;
}) => {
  const displayContent = quickReplies && quickReplies.length > 0 ? removeOptionsFromText(content) : content;
  const parts = parseMessageContent(displayContent);

  return (
    <div className={`max-w-[90%] sm:max-w-[85%] ${isUser ? "" : "w-full"}`}>
      <div
        className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-sm"
            : "bg-white text-gray-800 rounded-bl-sm shadow-md border border-gray-100"
        }`}
      >
        {parts.map((part, idx) => {
          if (typeof part === "string") {
            return (
              <div key={idx}>
                {renderTextBlock(part, `msg-${idx}`)}
              </div>
            );
          } else {
            const config = linkConfig[part.linkType];
            const IconComponent = config.icon;
            return (
              <a
                key={idx}
                href={part.url}
                target={part.linkType === "email" ? undefined : "_blank"}
                rel="noopener noreferrer"
                className={`group flex items-center justify-between mt-3 px-4 py-3 bg-gradient-to-r ${config.gradient} ${config.hoverGradient} text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                    <IconComponent className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm">{config.label}</div>
                    <div className="text-[11px] text-white/70">{config.sublabel}</div>
                  </div>
                </div>
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  {part.linkType === "ticket" ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                </div>
              </a>
            );
          }
        })}
      </div>

      {/* Forma za pretragu karata */}
      {showForm && events && onFormSubmit && (
        <TicketSearchForm events={events} onSubmit={onFormSubmit} isLoading={isLoading || false} />
      )}

      {/* Quick Reply dugmad */}
      {showQuickReplies && !showForm && quickReplies && quickReplies.length > 0 && onQuickReply && (
        <div className="mt-3 space-y-2">
          {quickReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => onQuickReply(reply.number)}
              className="w-full px-4 py-3 text-sm text-left bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-blue-50 hover:border-blue-400 active:bg-blue-100 hover:text-blue-700 transition-all duration-150 shadow-sm flex items-center gap-3 group"
            >
              <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-sm flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                {reply.number}
              </span>
              <span className="flex-1 font-medium">{reply.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasShownWelcome = useRef(false);

  // Dohvati evente kad se komponenta učita
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(
          "https://hvpytasddzeprgqkwlbu.supabase.co/rest/v1/AboutEvents?status=ilike.*active*&date=gte." +
            new Date().toISOString().split("T")[0] +
            "&select=name,date&order=date",
          {
            headers: {
              apikey:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHl0YXNkZHplcHJncWt3bGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDMyODQsImV4cCI6MjA4MjE3OTI4NH0.R1wPgBpyO7MHs0YL_pW0XBKkX8QweJ8MuhHUpuDSuKk",
            },
          },
        );
        const data = await response.json();
        setEvents(data.map((e: any) => `${e.name} (${e.date})`));
      } catch (error) {
        console.error("Failed to fetch events:", error);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (isOpen && !hasShownWelcome.current) {
      setMessages([
        {
          role: "assistant",
          content: WELCOME_MESSAGE,
          quickReplies: WELCOME_OPTIONS,
        },
      ]);
      hasShownWelcome.current = true;
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, showTicketForm]);

  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content: WELCOME_MESSAGE,
        quickReplies: WELCOME_OPTIONS,
      },
    ]);
    setInput("");
    setShowTicketForm(false);
  };

  const handleFormSubmit = async (formData: TicketFormData) => {
    setShowTicketForm(false);

    // Dodaj user poruku sa podacima
    const userMessage = `Tražim karte za: ${formData.event}\nIme: ${formData.name}\nEmail: ${formData.email}\nTelefon: ${formData.phone}`;

    const newMessages: Message[] = [
      ...messages.map((m) => ({ ...m, showForm: false })),
      { role: "user" as const, content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("https://hvpytasddzeprgqkwlbu.supabase.co/functions/v1/chat-support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHl0YXNkZHplcHJncWt3bGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDMyODQsImV4cCI6MjA4MjE3OTI4NH0.R1wPgBpyO7MHs0YL_pW0XBKkX8QweJ8MuhHUpuDSuKk",
        },
        body: JSON.stringify({
          message: `Pronađi karte. Event: ${formData.event}, Ime: ${formData.name}, Email: ${formData.email}, Telefon: ${formData.phone}`,
          conversation_history: [],
        }),
      });

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply || "Došlo je do greške. Kontaktirajte support@e-tickets.me",
      };
      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Greška u komunikaciji. Kontaktirajte support@e-tickets.me" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    // Ako korisnik odabere opciju 1, prikaži formu
    if (text === "1") {
      const updatedMessages = messages.map((msg, idx) =>
        idx === messages.length - 1 ? { ...msg, quickReplies: undefined } : msg,
      );

      setMessages([
        ...updatedMessages,
        { role: "user", content: "Nisam dobio/la karte" },
        { role: "assistant", content: "Popunite podatke ispod da pronađem vaše karte:", showForm: true },
      ]);
      setShowTicketForm(true);
      setInput("");
      return;
    }

    setShowTicketForm(false);
    const updatedMessages = messages.map((msg, idx) =>
      idx === messages.length - 1 ? { ...msg, quickReplies: undefined, showForm: false } : msg,
    );

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...updatedMessages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("https://hvpytasddzeprgqkwlbu.supabase.co/functions/v1/chat-support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHl0YXNkZHplcHJncWt3bGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDMyODQsImV4cCI6MjA4MjE3OTI4NH0.R1wPgBpyO7MHs0YL_pW0XBKkX8QweJ8MuhHUpuDSuKk",
        },
        body: JSON.stringify({
          message: text,
          conversation_history: newMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const replyContent = data.reply || "Došlo je do greške. Kontaktirajte support@e-tickets.me";
      const quickReplies = extractQuickReplies(replyContent);

      const assistantMessage: Message = {
        role: "assistant",
        content: replyContent,
        quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
      };
      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Greška u komunikaciji. Kontaktirajte support@e-tickets.me" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
          aria-label="Otvori chat"
        >
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[400px] sm:h-[600px] bg-gray-50 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden sm:border sm:border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white safe-area-top">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">etickets</div>
                <div className="text-xs text-blue-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Online podrška
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={resetChat}
                className="hover:bg-white/20 active:bg-white/30 rounded-full p-2.5 transition-colors"
                aria-label="Počni ispočetka"
                title="Počni ispočetka"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 active:bg-white/30 rounded-full p-2.5 transition-colors"
                aria-label="Zatvori chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <MessageBubble
                  content={msg.content}
                  isUser={msg.role === "user"}
                  quickReplies={msg.quickReplies}
                  onQuickReply={sendMessage}
                  showQuickReplies={idx === messages.length - 1 && !isLoading && !showTicketForm}
                  showForm={msg.showForm && idx === messages.length - 1 && !isLoading}
                  events={events}
                  onFormSubmit={handleFormSubmit}
                  isLoading={isLoading}
                />
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-sm shadow-md border border-gray-100">
                  <div className="flex gap-1.5">
                    <span
                      className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white safe-area-bottom">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Postavite pitanje..."
                disabled={isLoading || showTicketForm}
                className="flex-1 px-4 py-3 rounded-full border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400 text-base sm:text-sm text-gray-900 bg-white placeholder-gray-400"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading || showTicketForm}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 active:from-blue-800 active:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 text-white flex items-center justify-center transition-all flex-shrink-0 shadow-md disabled:shadow-none"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .safe-area-top {
          padding-top: max(0.75rem, env(safe-area-inset-top));
        }
        .safe-area-bottom {
          padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
        }
        @media (max-width: 639px) {
          .safe-area-top {
            padding-top: max(1rem, env(safe-area-inset-top));
          }
          .safe-area-bottom {
            padding-bottom: max(1rem, env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </>
  );
};

export default ChatWidget;
