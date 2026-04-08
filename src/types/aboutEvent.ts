export interface AboutEvent {
  id: string;
  name: string;
  slug: string;
  date: string;
  endDate?: string;
  event_time?: string;
  endTime?: string;
  venue?: string;
  serviceFeePercentage?: string;
  pdvPercentage?: string;
  biletarnicaFee?: string;
  currency?: string;
  workspaceKey?: string;
  eventId?: string;
  eventKey?: string;
  eventType?: string; // DODATO: "seats" | "simple"
  termin2?: string;
  categories?: string;
  description?: string;
  image?: string;
  heroImage?: string;
  heroImageMobile?: string;
  info?: string;
  dogadjaj?: string;
  category?: string;
  link?: string;
  prioritet?: string;
  organizer?: string;
  email?: string;
  status?: string;
  hide?: string | boolean;
  performer?: string;
  biografija?: string;

  // Match-specific fields
  is_match?: boolean;
  sport?: string;
  home_team_id?: string;
  away_team_id?: string;
  competition?: string;
  match_round?: string;
}

export interface TicketCategory {
  category: string;
  price: number;
  type?: "regular" | "table";
  tableFixedPrice?: number;
  description?: string;
}
