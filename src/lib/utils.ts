import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes image URLs, transforming Google Drive preview links into direct image content URLs.
 */
export function cleanImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  
  const trimmedUrl = url.trim();
  
  // Resolve Google Drive links
  if (trimmedUrl.includes("drive.google.com") || trimmedUrl.includes("docs.google.com")) {
    // Matches /file/d/FILE_ID/view or /file/d/FILE_ID/edit
    const fileIdMatch = trimmedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
    
    // Matches id=FILE_ID
    const idParamMatch = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch && idParamMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idParamMatch[1]}`;
    }
  }
  
  return trimmedUrl;
}
