-- Create function to normalize text for slugs (replace diacritics, lowercase)
CREATE OR REPLACE FUNCTION public.normalize_slug_text(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(input_text, 'đ', 'dj', 'gi'),
                  'ž', 'z', 'gi'),
                'č', 'c', 'gi'),
              'ć', 'c', 'gi'),
            'š', 's', 'gi'),
          '&', 'and', 'g'),
        '\s+', '-', 'g'),
      '[^a-z0-9\-]', '', 'g')
  );
END;
$$;

-- Create function to generate canonical event slug
-- Format: {performer}-{venue}-{city}-{yyyy-mm-dd}
CREATE OR REPLACE FUNCTION public.generate_canonical_event_slug(
  event_name text,
  venue_name text,
  venue_city text,
  event_date date
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  performer_part text;
  venue_part text;
  city_part text;
  date_part text;
BEGIN
  -- Use event name as performer (simplified - admin can refine)
  performer_part := public.normalize_slug_text(COALESCE(event_name, 'event'));
  
  -- Normalize venue
  venue_part := public.normalize_slug_text(COALESCE(venue_name, 'venue'));
  
  -- Normalize city
  city_part := public.normalize_slug_text(COALESCE(venue_city, 'me'));
  
  -- Format date as yyyy-mm-dd
  date_part := to_char(COALESCE(event_date, CURRENT_DATE), 'YYYY-MM-DD');
  
  -- Combine and clean up multiple dashes
  RETURN regexp_replace(
    performer_part || '-' || venue_part || '-' || city_part || '-' || date_part,
    '-+', '-', 'g'
  );
END;
$$;

-- Update existing AboutEvents slugs to canonical format
-- Join with venues table to get city information
UPDATE public."AboutEvents" ae
SET slug = public.generate_canonical_event_slug(
  ae.name,
  ae.venue,
  COALESCE(v.city, 'me'),
  ae.date
)
FROM public.venues v
WHERE lower(ae.venue) = lower(v.name)
  OR lower(ae.venue) LIKE '%' || lower(v.name) || '%';

-- Update remaining events that didn't match a venue (use 'me' as default city)
UPDATE public."AboutEvents"
SET slug = public.generate_canonical_event_slug(
  name,
  venue,
  'me',
  date
)
WHERE slug IS NULL 
   OR slug = '' 
   OR slug NOT LIKE '%-%-%-%';