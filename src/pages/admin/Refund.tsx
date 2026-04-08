// src/pages/admin/Refund.tsx
// Admin Panel za upravljanje zahtjevima za povrat sredstava
// Sa React Query za keširanje i ispravnom verifikacijom po "order number"

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  RefreshCw,
  Download,
  FileText,
  Check,
  X,
  Info,
  Shield,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Supabase konfiguracija
const SUPABASE_URL = "https://hvpytasddzeprgqkwlbu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHl0YXNkZHplcHJncWt3bGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDMyODQsImV4cCI6MjA4MjE3OTI4NH0.R1wPgBpyO7MHs0YL_pW0XBKkX8QweJ8MuhHUpuDSuKk";

interface RefundRequest {
  _id: string;
  orderNumber: string;
  fullName: string;
  email: string;
  phone: string;
  initials: string;
  eventName: string;
  eventId: string;
  ticketCount: number;
  ticketPrice: string;
  rawTicketPrice: number;
  refundType: string;
  refundAmount: string;
  currency: string;
  status: string;
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  reason: string;
  refundReason: string;
  refundMethod: string;
  partialRefund: boolean;
  submissionDate: string;
  rejectReason: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processed: number;
  totalValue: number;
}

interface Verification {
  verified: boolean;
  ticketCount: number;
  hasInsurance: boolean;
  insuranceCount: number;
  totalPrice: number;
  tickets: any[];
}

const REJECT_REASONS = [
  {
    value: "invalid_order",
    label: "Neispravan broj narudžbe",
    text: "Neispravan broj narudžbe - nije moguće identificirati kupovinu.",
  },
  {
    value: "not_found",
    label: "Narudžba nije pronađena",
    text: "Narudžba nije pronađena u našem sistemu. Molimo provjerite broj narudžbe.",
  },
  { value: "already_refunded", label: "Povrat već izvršen", text: "Povrat sredstava za ovu narudžbu je već izvršen." },
  {
    value: "event_not_cancelled",
    label: "Događaj nije otkazan",
    text: "Događaj nije otkazan, te nije moguć povrat sredstava po ovom osnovu.",
  },
  {
    value: "deadline_passed",
    label: "Istekao rok",
    text: "Nažalost, istekao je rok za podnošenje zahtjeva za povrat.",
  },
  {
    value: "incomplete_data",
    label: "Nepotpuni podaci",
    text: "Zahtjev sadrži nepotpune podatke. Molimo podnesite novi zahtjev sa ispravnim podacima.",
  },
  {
    value: "wrong_account",
    label: "Pogrešni podaci računa",
    text: "Podaci bankovnog računa nisu ispravni. Molimo podnesite novi zahtjev.",
  },
  {
    value: "duplicate_request",
    label: "Duplikat zahtjeva",
    text: "Za ovu narudžbu već postoji aktivan zahtjev za povrat.",
  },
  {
    value: "policy_violation",
    label: "Kršenje pravila",
    text: "Nakon razmatranja Vašeg zahtjeva, obavještavamo Vas da povrat sredstava nije odobren, jer navedeni razlog ne ispunjava uslove za povrat prema pravilima organizatora i opštim uslovima kupovine koje ste prihvatili prilikom kupovine ulaznica.",
  },
  { value: "other", label: "Drugi razlog", text: "" },
];

function getReasonText(reasonCode: string): string {
  const reasons: Record<string, string> = {
    personal_reasons: "Lični razlozi",
    health_issues: "Zdravstveni problemi",
    transport_issues: "Problemi sa prevozom",
    lineup_changes: "Promjene u programu događaja",
    weather_conditions: "Loše vremenske prilike",
    cancelled_event: "Otkazan događaj",
    accommodation_issues: "Problemi sa smještajem",
    other: "Drugi razlog",
  };
  return reasons[reasonCode] || reasonCode || "Lični razlozi";
}

// Fetch funkcija za React Query
const fetchRefundData = async () => {
  const { data: povrati, error } = await supabase
    .from("povrati")
    .select("*")
    .order("Created Date", { ascending: false });

  if (error) throw new Error(error.message);

  // Filtriraj duplikate
  const uniqueRequests: any[] = [];
  const seenOrderNumbers = new Set();

  for (const item of povrati || []) {
    const orderNum = item["Ordernumber"] || "";
    if (!orderNum || !seenOrderNumbers.has(orderNum)) {
      uniqueRequests.push(item);
      if (orderNum) seenOrderNumbers.add(orderNum);
    }
  }

  // Statistika
  const stats = { total: uniqueRequests.length, pending: 0, approved: 0, rejected: 0, processed: 0, totalValue: 0 };
  uniqueRequests.forEach((req) => {
    const status = (req["Status"] || "pending").toLowerCase().trim();
    if (status === "pending") stats.pending++;
    else if (status === "approved") stats.approved++;
    else if (status === "rejected") stats.rejected++;
    else if (status === "processed") stats.processed++;
    stats.totalValue += Number(req["Ticket Price"]) || 0;
  });

  // Eventi
  const events = [
    ...new Set(uniqueRequests.map((req) => req["Event Name"]).filter((e) => e && e.trim() && e !== "Nepoznat događaj")),
  ].sort() as string[];

  // Pripremi podatke
  const requests = uniqueRequests.map((request) => {
    const isPartialRefund = request["Partial Refund"] === true;
    const rawPrice = Number(request["rawTicketPrice"]) || Number(request["Ticket Price"]) || 0;
    const refundAmount = isPartialRefund ? rawPrice * 0.8 : rawPrice;
    const fullName = request["Full Name"] || "";
    const nameParts = fullName.split(" ");
    const initials = nameParts
      .map((part: string) => part[0] || "")
      .join("")
      .toUpperCase();

    return {
      _id: request["ID"],
      orderNumber: request["Ordernumber"] || "-",
      fullName,
      email: request["Email"] || "",
      phone: request["Phone"] || "",
      initials: initials || "NA",
      eventName: request["Event Name"] || "Nepoznat događaj",
      eventId: request["Event ID"] || "",
      ticketCount: request["Ticket Count"] || 1,
      ticketPrice: `${Number(request["Ticket Price"] || 0).toFixed(2)} ${request["currency"] || "EUR"}`,
      rawTicketPrice: rawPrice,
      refundType: isPartialRefund ? "Standardni (80%)" : "Otkazano (100%)",
      refundAmount: `${refundAmount.toFixed(2)} ${request["currency"] || "EUR"}`,
      currency: request["currency"] || "EUR",
      status: (request["Status"] || "pending").toLowerCase().trim(),
      bankAccount: request["Bankaccount"] || "",
      bankName: request["Bank Name"] || "",
      accountHolder: request["Account Holder"] || fullName,
      reason: getReasonText(request["Refund Reason"]),
      refundReason: request["Refund Reason"] || "",
      refundMethod: request["Refund Method"] || "bank",
      partialRefund: isPartialRefund,
      submissionDate: request["Submission Date"] || request["Created Date"],
      rejectReason: request["Rejectreason"] || request["Rejectionreason"] || "",
    };
  });

  // ═══════════════════════════════════════════════════════════════
  // VERIFIKACIJA - traži po "order number" koloni + fuzzy match
  // ═══════════════════════════════════════════════════════════════
  const similarChars: Record<string, string[]> = {
    I: ["l", "1"], l: ["I", "1"], "1": ["l", "I"], O: ["0"], "0": ["O"],
  };
  const generateVariations = (orderNum: string): string[] => {
    const variations: string[] = [];
    for (let i = 0; i < orderNum.length; i++) {
      const ch = orderNum[i];
      if (similarChars[ch]) {
        for (const alt of similarChars[ch]) {
          variations.push(orderNum.slice(0, i) + alt + orderNum.slice(i + 1));
        }
      }
    }
    return variations;
  };

  const orderNumbers = requests.map((r) => r.orderNumber).filter((n) => n && n !== "-");
  const verification: Record<string, Verification> = {};

  for (const orderNum of orderNumbers.slice(0, 50)) {
    try {
      // Traži po "order number" koloni (sa razmakom!)
      const { data: tickets, error: ticketError } = await supabase
        .from("QRKarte")
        .select("id, ticketId, price, totalPrice, insurance, insurancePrice")
        .eq("order number", orderNum)
        .limit(20);

      if (ticketError) {
        console.log(`Verification query error for ${orderNum}:`, ticketError.message);
        continue;
      }

      const buildVerification = (foundTickets: any[]): Verification => {
        const insuranceTickets = foundTickets.filter((t) => t.insurance === true || t.insurance === "true");
        return {
          verified: true,
          ticketCount: foundTickets.length,
          hasInsurance: insuranceTickets.length > 0,
          insuranceCount: insuranceTickets.length,
          totalPrice: foundTickets.reduce((sum, t) => {
            const tp = Number(t.totalPrice) || Number(t.price) || 0;
            const isInsured = t.insurance === true || t.insurance === "true";
            const basePrice = Number(t.price) || 0;
            // Ako je osigurano a insurancePrice nije upisan, izračunaj kao 7% od base price
            const insPrice = isInsured ? (Number(t.insurancePrice) || Math.round(basePrice * 0.07 * 100) / 100) : 0;
            return sum + tp + insPrice;
          }, 0),
          tickets: foundTickets,
        };
      };

      if (tickets && tickets.length > 0) {
        verification[orderNum] = buildVerification(tickets);
      } else {
        // Fallback 1: case-insensitive pretraga (za stare zahtjeve sa .toUpperCase() problemom)
        const { data: ilikeTickets } = await supabase
          .from("QRKarte")
          .select("id, ticketId, price, totalPrice, insurance, insurancePrice")
          .ilike("order number", orderNum)
          .limit(20);

        if (ilikeTickets && ilikeTickets.length > 0) {
          verification[orderNum] = buildVerification(ilikeTickets);
        } else {
          // Fallback 2: fuzzy match za slične karaktere (I/l/1, O/0)
          let found = false;
          const variations = generateVariations(orderNum);
          for (const variant of variations) {
            const { data: varTickets } = await supabase
              .from("QRKarte")
              .select("id, ticketId, price, totalPrice, insurance, insurancePrice")
              .ilike("order number", variant)
              .limit(20);
            if (varTickets && varTickets.length > 0) {
              verification[orderNum] = buildVerification(varTickets);
              found = true;
              break;
            }
          }
          if (!found) {
            verification[orderNum] = {
              verified: false,
              ticketCount: 0,
              hasInsurance: false,
              insuranceCount: 0,
              totalPrice: 0,
              tickets: [],
            };
          }
        }
      }
    } catch (e) {
      console.log(`Verification failed for ${orderNum}:`, e);
    }
  }

  return { requests, stats, events, verification };
};

export default function Refund() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // React Query - kešira podatke 5 minuta
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["refund-requests"],
    queryFn: fetchRefundData,
    staleTime: 5 * 60 * 1000, // 5 minuta - podaci su "svježi"
    gcTime: 10 * 60 * 1000, // 10 minuta - drži u kešu
    refetchOnWindowFocus: false, // Ne osvježava kad se vratiš na tab
  });

  const requests = data?.requests || [];
  const stats = data?.stats || { total: 0, pending: 0, approved: 0, rejected: 0, processed: 0, totalValue: 0 };
  const events = data?.events || [];
  const verification = data?.verification || {};

  // State
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [detailModal, setDetailModal] = useState<RefundRequest | null>(null);
  const [approveModal, setApproveModal] = useState<RefundRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<RefundRequest | null>(null);
  const [rejectReasonType, setRejectReasonType] = useState("");
  const [customRejectReason, setCustomRejectReason] = useState("");

  // Filter logic
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchFields = [
          req.fullName?.toLowerCase(),
          req.email?.toLowerCase(),
          req.phone?.toLowerCase(),
          req.orderNumber?.toLowerCase(),
        ];
        if (!searchFields.some((field) => field?.includes(query))) return false;
      }
      if (statusFilter !== "all" && req.status !== statusFilter) return false;
      if (eventFilter !== "all" && req.eventName !== eventFilter) return false;
      if (verificationFilter !== "all") {
        const ver = verification[req.orderNumber];
        if (verificationFilter === "verified" && !ver?.verified) return false;
        if (verificationFilter === "not-verified" && ver?.verified) return false;
        if (verificationFilter === "insured" && !ver?.hasInsurance) return false;
      }
      return true;
    });
  }, [requests, searchQuery, statusFilter, eventFilter, verificationFilter, verification]);

  const filteredTotal = useMemo(() => {
    return filteredRequests.reduce((sum, req) => sum + (req.rawTicketPrice || 0), 0);
  }, [filteredRequests]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.filter((r) => r.status === "pending").length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.filter((r) => r.status === "pending").map((r) => r._id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // APPROVE - direktan fetch
  const handleApprove = async (request: RefundRequest) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/approve-refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refund_id: request._id }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Greška pri odobravanju");

      toast({
        title: "Uspješno ✅",
        description: `${data.message}${data.emailSent ? " | Email poslan" : ""}`,
      });

      setApproveModal(null);
      queryClient.invalidateQueries({ queryKey: ["refund-requests"] });
    } catch (error: any) {
      console.error("Approve error:", error);
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  // REJECT - direktan fetch
  const handleReject = async (request: RefundRequest) => {
    const reason =
      rejectReasonType === "other"
        ? customRejectReason
        : REJECT_REASONS.find((r) => r.value === rejectReasonType)?.text || "";

    if (!reason) {
      toast({ title: "Greška", description: "Morate odabrati razlog odbijanja", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reject-refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refund_id: request._id, reject_reason: reason }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Greška pri odbijanju");

      toast({
        title: "Zahtjev odbijen",
        description: `${data.message}${data.emailSent ? " | Email poslan" : ""}`,
      });

      setRejectModal(null);
      setRejectReasonType("");
      setCustomRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["refund-requests"] });
    } catch (error: any) {
      console.error("Reject error:", error);
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Da li ste sigurni da želite odobriti ${selectedIds.size} zahtjev(a)?`)) return;

    setActionLoading(true);
    let successCount = 0;

    for (const id of selectedIds) {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/approve-refund`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refund_id: id }),
        });
        const data = await response.json();
        if (data.success) successCount++;
      } catch (e) {
        console.error(e);
      }
    }

    toast({ title: "Bulk odobravanje", description: `Odobreno ${successCount} od ${selectedIds.size} zahtjeva` });
    setSelectedIds(new Set());
    setActionLoading(false);
    queryClient.invalidateQueries({ queryKey: ["refund-requests"] });
  };

  // Bulk reject
  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    const reason = prompt(`Unesite razlog odbijanja za ${selectedIds.size} zahtjev(a):`);
    if (!reason) return;

    setActionLoading(true);
    let successCount = 0;

    for (const id of selectedIds) {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/reject-refund`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refund_id: id, reject_reason: reason }),
        });
        const data = await response.json();
        if (data.success) successCount++;
      } catch (e) {
        console.error(e);
      }
    }

    toast({ title: "Bulk odbijanje", description: `Odbijeno ${successCount} od ${selectedIds.size} zahtjeva` });
    setSelectedIds(new Set());
    setActionLoading(false);
    queryClient.invalidateQueries({ queryKey: ["refund-requests"] });
  };

  // Export CSV
  const exportToCSV = () => {
    const headers = ["Ime", "Email", "Telefon", "Narudžba", "Događaj", "Iznos", "Račun", "Status", "Datum"];
    const rows = filteredRequests.map((r) => [
      r.fullName,
      r.email,
      r.phone,
      r.orderNumber,
      r.eventName,
      r.refundAmount,
      r.bankAccount,
      r.status,
      r.submissionDate,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c || ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `povrati_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast({ title: "Export", description: `Exportovano ${filteredRequests.length} zahtjeva` });
  };

  // Status badge - ISPRAVLJENO sa normalizacijom
  const getStatusBadge = (status: string) => {
    const normalizedStatus = (status || "").toLowerCase().trim();

    switch (normalizedStatus) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Na čekanju
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Odobren
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Odbijen
          </Badge>
        );
      case "processed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Obrađeno
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || "Nepoznat"}</Badge>;
    }
  };

  // Verification badge - ISPRAVLJENO
  const getVerificationBadge = (orderNumber: string) => {
    const ver = verification[orderNumber];

    // Ako nema podataka o verifikaciji
    if (!ver) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-500">
          <Clock className="w-3 h-3 mr-1" />
          Provjerava se...
        </Badge>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {ver.verified ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verifikovano ({ver.ticketCount} {ver.ticketCount === 1 ? "karta" : "karte"})
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Nije u bazi
          </Badge>
        )}
        {ver.hasInsurance && (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Shield className="w-3 h-3 mr-1" />
            Osigurano ({ver.insuranceCount})
          </Badge>
        )}
      </div>
    );
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("sr-ME", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Loading samo prvi put
  if (isLoading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Učitavanje podataka...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">📋 Zahtjevi za Povrat</h1>
          {isFetching && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Osvježi
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Ukupno</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-gray-500">Na čekanju</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-sm text-gray-500">Odobreno</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-sm text-gray-500">Odbijeno</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredTotal.toFixed(2)} €</p>
              <p className="text-sm text-gray-500">Filtrirano</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Pretraži po imenu, emailu, telefonu ili broju narudžbe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi statusi</SelectItem>
                <SelectItem value="pending">Na čekanju</SelectItem>
                <SelectItem value="approved">Odobreno</SelectItem>
                <SelectItem value="rejected">Odbijeno</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Događaj" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi događaji</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event} value={event}>
                    {event}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Verifikacija" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sve verifikacije</SelectItem>
                <SelectItem value="verified">✅ Verifikovano</SelectItem>
                <SelectItem value="not-verified">❌ Nije u bazi</SelectItem>
                <SelectItem value="insured">🛡️ Osigurano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="bg-blue-600 text-white">
          <CardContent className="p-4 flex justify-between items-center">
            <span className="font-medium">{selectedIds.size} odabrano</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleBulkApprove} disabled={actionLoading}>
                <Check className="w-4 h-4 mr-1" /> Odobri sve
              </Button>
              <Button variant="secondary" size="sm" onClick={handleBulkReject} disabled={actionLoading}>
                <X className="w-4 h-4 mr-1" /> Odbij sve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="text-white hover:text-white hover:bg-blue-700"
              >
                Poništi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      selectedIds.size > 0 &&
                      selectedIds.size === filteredRequests.filter((r) => r.status === "pending").length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Korisnik</TableHead>
                <TableHead>Narudžba</TableHead>
                <TableHead>Događaj</TableHead>
                <TableHead>Iznos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verifikacija</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nema zahtjeva za prikaz</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request._id} className="hover:bg-gray-50">
                    <TableCell>
                      {request.status === "pending" && (
                        <Checkbox
                          checked={selectedIds.has(request._id)}
                          onCheckedChange={() => toggleSelect(request._id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                          {request.initials}
                        </div>
                        <div>
                          <p className="font-medium">{request.fullName}</p>
                          <p className="text-sm text-gray-500">{request.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono font-medium">{request.orderNumber}</p>
                      {request.phone && <p className="text-sm text-gray-500">{request.phone}</p>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{request.eventName}</TableCell>
                    <TableCell className="font-semibold">{request.refundAmount}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{getVerificationBadge(request.orderNumber)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(request.submissionDate)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailModal(request)} title="Detalji">
                          <Info className="w-4 h-4" />
                        </Button>
                        {request.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => setApproveModal(request)}
                              title="Odobri"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setRejectModal(request)}
                              title="Odbij"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t text-sm text-gray-500">
          Prikazano {filteredRequests.length} od {requests.length} zahtjeva
        </div>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalji zahtjeva #{detailModal?.orderNumber}</DialogTitle>
          </DialogHeader>
          {detailModal && (
            <div className="space-y-4">
              {verification[detailModal.orderNumber]?.verified ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Kupovina pronađena u bazi</p>
                    <p className="text-sm text-green-600">
                      Broj karata: {verification[detailModal.orderNumber]?.ticketCount} | Ukupna cijena:{" "}
                      {verification[detailModal.orderNumber]?.totalPrice?.toFixed(2)} EUR
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Kupovina NIJE pronađena u bazi!</p>
                    <p className="text-sm text-red-600">Provjerite broj narudžbe</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-500 text-sm uppercase mb-3">👤 Podaci o korisniku</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ime:</span>
                      <span className="font-medium">{detailModal.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span>{detailModal.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Telefon:</span>
                      <span>{detailModal.phone || "-"}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-500 text-sm uppercase mb-3">🎫 Podaci o narudžbi</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Narudžba:</span>
                      <span className="font-mono font-medium">{detailModal.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Događaj:</span>
                      <span>{detailModal.eventName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Broj karata:</span>
                      <span>{detailModal.ticketCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cijena:</span>
                      <span>{detailModal.ticketPrice}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-500 text-sm uppercase mb-3">🏦 Podaci za povrat</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Broj računa:</span>
                      <span className="font-mono">{detailModal.bankAccount || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vlasnik:</span>
                      <span>{detailModal.accountHolder || "-"}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-500 text-sm uppercase mb-3">💰 Povrat sredstava</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tip:</span>
                      <span>{detailModal.refundType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Iznos:</span>
                      <span className="font-bold text-green-600 text-lg">{detailModal.refundAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      {getStatusBadge(detailModal.status)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-500 text-sm uppercase mb-2">📝 Razlog povrata</h4>
                <p className="bg-gray-50 p-3 rounded-lg text-sm">{detailModal.reason || "Nije naveden"}</p>
              </div>

              {detailModal.rejectReason && (
                <div>
                  <h4 className="font-semibold text-red-500 text-sm uppercase mb-2">❌ Razlog odbijanja</h4>
                  <p className="bg-red-50 p-3 rounded-lg text-sm text-red-700">{detailModal.rejectReason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {detailModal?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailModal(null);
                    setRejectModal(detailModal);
                  }}
                >
                  Odbij
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setDetailModal(null);
                    setApproveModal(detailModal);
                  }}
                >
                  Odobri
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setDetailModal(null)}>
              Zatvori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={!!approveModal} onOpenChange={() => setApproveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✅ Odobri zahtjev</DialogTitle>
            <DialogDescription>Da li ste sigurni da želite odobriti ovaj zahtjev za povrat?</DialogDescription>
          </DialogHeader>
          {approveModal && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Korisnik:</span>
                <span className="font-medium">{approveModal.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Narudžba:</span>
                <span className="font-mono">{approveModal.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Događaj:</span>
                <span>{approveModal.eventName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Iznos:</span>
                <span className="font-bold text-green-600">{approveModal.refundAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Račun:</span>
                <span className="font-mono">{approveModal.bankAccount || "-"}</span>
              </div>
            </div>
          )}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 text-sm">
              ✅ Email obavještenje će biti poslano korisniku i računovodstvu automatski.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveModal(null)} disabled={actionLoading}>
              Odustani
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveModal && handleApprove(approveModal)}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Potvrdi odobravanje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog
        open={!!rejectModal}
        onOpenChange={() => {
          setRejectModal(null);
          setRejectReasonType("");
          setCustomRejectReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>❌ Odbij zahtjev</DialogTitle>
          </DialogHeader>
          {rejectModal && (
            <>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Korisnik:</span>
                  <span className="font-medium">{rejectModal.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Narudžba:</span>
                  <span className="font-mono">{rejectModal.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Iznos:</span>
                  <span className="font-bold">{rejectModal.refundAmount}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Razlog odbijanja:</label>
                <Select value={rejectReasonType} onValueChange={setRejectReasonType}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Odaberite razlog --" />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECT_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {rejectReasonType === "other" && (
                <Textarea
                  placeholder="Unesite razlog odbijanja..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  rows={4}
                />
              )}
            </>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectModal(null);
                setRejectReasonType("");
                setCustomRejectReason("");
              }}
              disabled={actionLoading}
            >
              Odustani
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectModal && handleReject(rejectModal)}
              disabled={actionLoading || !rejectReasonType}
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Potvrdi odbijanje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
