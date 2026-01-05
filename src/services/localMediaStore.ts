import type { MediaItem } from '../types/googlePhotos';

const STORAGE_KEY = 'photos-memory-media-items';

export function saveMediaItems(items: MediaItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadMediaItems(): MediaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is MediaItem => typeof item?.id === 'string' && typeof item?.baseUrl === 'string');
  } catch (error) {
    console.error('Failed to parse cached media items', error);
    return [];
  }
}

export function clearMediaItems(): void {
  localStorage.removeItem(STORAGE_KEY);
}
