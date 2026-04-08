-- Montenegro Beer Fest 2025 - JEDAN event sa svim kategorijama
-- Run this in Supabase SQL Editor

INSERT INTO "AboutEvents" (
  name, slug, date, event_time, venue, category, info,
  description, categories, currency, "serviceFeePercentage",
  "eventType", "eventId", organizer, status, hide, image
) VALUES (
  'Montenegro Beer Fest',
  'montenegro-beer-fest-cetinje-2026',
  '2026-07-31',
  '19:00',
  'Turisticki parking, Cetinje',
  'Festival',
  'Montenegro Beer Fest je jedan od najvecih ljetnjih muzicko-zabavnih dogadjaja u Crnoj Gori, koji se odrzava na Cetinju. Festival okuplja renomirane regionalne izvodjace, bogatu ponudu piva i hrane, i svake veceri privlaci veliki broj posjetilaca, stvarajuci jedinstvenu festivalsku atmosferu i snazan doprinos turistickoj ponudi destinacije.',
  '[{"category":"Prvi dan - 31. jul","price":15,"type":"regular","description":"Jednodnevna ulaznica - Parter"},{"category":"Drugi dan - 1. avgust","price":15,"type":"regular","description":"Jednodnevna ulaznica - Parter"},{"category":"Treci dan - 2. avgust","price":15,"type":"regular","description":"Jednodnevna ulaznica - Parter"},{"category":"Trodnevna","price":35,"type":"regular","description":"31. jul, 1. i 2. avgust - Parter"}]',
  'Prvi dan - 31. jul - 15 EUR, Drugi dan - 1. avgust - 15 EUR, Treci dan - 2. avgust - 15 EUR, Trodnevna - 35 EUR',
  'EUR',
  '5',
  'simple',
  'montenegro-beer-fest-cetinje-2026',
  'MNEvent d.o.o.',
  'active',
  'true',
  NULL
);
