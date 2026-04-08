// Optimizuje Supabase Storage slike koristeći Image Transformations
// Smanjuje veličinu slika i konvertuje u WebP format

export const getOptimizedImageUrl = (
  url: string | null | undefined,
  width: number = 800,
  quality: number = 75,
): string => {
  if (!url) return "/placeholder.svg";

  // Ako nije Supabase storage URL, vrati originalni
  if (!url.includes("supabase.co/storage/v1/object/")) {
    return url;
  }

  // Pretvori u transformacijski URL
  // Od: /storage/v1/object/public/bucket/file.jpg
  // U:  /storage/v1/render/image/public/bucket/file.jpg?width=800&quality=75&format=webp
  return (
    url.replace("/storage/v1/object/", "/storage/v1/render/image/") + `?width=${width}&quality=${quality}&format=webp`
  );
};

// Predefinirane veličine za različite upotrebe
export const imagePresets = {
  thumbnail: (url: string) => getOptimizedImageUrl(url, 400, 70),
  card: (url: string) => getOptimizedImageUrl(url, 600, 75),
  banner: (url: string) => getOptimizedImageUrl(url, 1000, 75),
  hero: (url: string) => getOptimizedImageUrl(url, 1200, 80),
  full: (url: string) => getOptimizedImageUrl(url, 1920, 85),
};
