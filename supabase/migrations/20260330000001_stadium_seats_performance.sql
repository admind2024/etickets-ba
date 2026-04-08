-- ═══════════════════════════════════════════════════════════════
-- Stadium Seats Performance: RPC aggregations + composite indexes
-- ═══════════════════════════════════════════════════════════════

-- 1. Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_stadium_seats_event_status
ON public.stadium_seats(event_id, status);

CREATE INDEX IF NOT EXISTS idx_stadium_seats_event_section
ON public.stadium_seats(event_id, section);

CREATE INDEX IF NOT EXISTS idx_stadium_seats_event_section_status
ON public.stadium_seats(event_id, section, status);

-- 2. Public: seat availability per section (replaces client-side aggregation)
--    Returns summary with all status counts so frontend can pick what it needs.
CREATE OR REPLACE FUNCTION public.get_seat_availability(p_event_id UUID)
RETURNS TABLE(
  section TEXT,
  total BIGINT,
  available BIGINT,
  reserved BIGINT,
  sold BIGINT,
  away_fans BIGINT,
  blocked BIGINT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.section,
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE s.status = 'available')::BIGINT AS available,
    COUNT(*) FILTER (WHERE s.status = 'reserved')::BIGINT AS reserved,
    COUNT(*) FILTER (WHERE s.status = 'sold')::BIGINT AS sold,
    COUNT(*) FILTER (WHERE s.status = 'away_fans')::BIGINT AS away_fans,
    COUNT(*) FILTER (WHERE s.status = 'blocked')::BIGINT AS blocked
  FROM stadium_seats s
  WHERE s.event_id = p_event_id
  GROUP BY s.section
  ORDER BY s.section;
END;
$$;
