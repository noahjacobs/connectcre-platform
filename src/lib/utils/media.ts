export function getImageUrl(image: any): string | null {
  if (!image) return null;

  // If it's an array (post.images), get the first image
  if (Array.isArray(image)) {
    const firstImage = image[0];
    if (firstImage) {
      // Handle nested Sanity-like structure: image.asset.url
      if (firstImage.image && firstImage.image.asset && firstImage.image.asset.url) {
        return firstImage.image.asset.url;
      }
      // Handle direct object with url
      if (firstImage.url) {
        return firstImage.url;
      }
      // Handle string URL
      if (typeof firstImage === 'string') {
        return firstImage;
      }
    }
    return null;
  }

  // Handle single image with nested Sanity-like structure
  if (image.image && image.image.asset && image.image.asset.url) {
    return image.image.asset.url;
  }

  // Handle legacy Sanity format: asset.url
  if (image.asset && image.asset.url) {
    return image.asset.url;
  }

  // If it has a direct URL property (direct Supabase format)
  if (typeof image === 'object' && image.url) {
    return image.url;
  }

  // If it's already a string URL
  if (typeof image === 'string') {
    return image;
  }

  return null;
} 