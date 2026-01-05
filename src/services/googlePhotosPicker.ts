import type { MediaItem } from '../types/googlePhotos';

const API_BASE = 'https://photospicker.googleapis.com/v1';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DEFAULT_MAX_ITEM_COUNT = 50;
const parsedMaxItemCount = Number(import.meta.env.VITE_PHOTOS_MAX_ITEM_COUNT);
const RESOLVED_MAX_ITEM_COUNT =
  Number.isFinite(parsedMaxItemCount) && parsedMaxItemCount > 0 ? Math.round(parsedMaxItemCount) : DEFAULT_MAX_ITEM_COUNT;

type PollingConfig = {
  pollInterval?: string;
  timeoutIn?: string;
};

type PickingSession = {
  id: string;
  pickerUri: string;
  mediaItemsSet?: boolean;
  pollingConfig?: PollingConfig;
};

type RawPickedMediaItem = {
  id?: string;
  createTime?: string;
  type?: 'TYPE_UNSPECIFIED' | 'PHOTO' | 'VIDEO';
  mediaFile?: {
    baseUrl?: string;
    mimeType?: string;
    filename?: string;
    mediaFileMetadata?: {
      width?: number;
      height?: number;
    };
  };
};

type MediaItemsListResponse = {
  mediaItems?: RawPickedMediaItem[];
  nextPageToken?: string;
};

const defaultBody = {
  pickingConfig: {
    maxItemCount: RESOLVED_MAX_ITEM_COUNT,
  },
};

function buildUrl(path: string): string {
  if (!API_KEY) {
    throw new Error('Missing VITE_GOOGLE_API_KEY in environment.');
  }
  const separator = path.includes('?') ? '&' : '?';
  return `${API_BASE}${path}${separator}key=${API_KEY}`;
}

async function request<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Photos Picker API error: ${message}`);
  }

  return (await response.json()) as T;
}

export async function createPickerSession(accessToken: string): Promise<PickingSession> {
  return request<PickingSession>('/sessions', accessToken, {
    method: 'POST',
    body: JSON.stringify(defaultBody),
  });
}

export async function getPickerSession(accessToken: string, sessionId: string): Promise<PickingSession> {
  return request<PickingSession>(`/sessions/${sessionId}`, accessToken);
}

async function listPickedMediaItems(accessToken: string, sessionId: string): Promise<MediaItem[]> {
  const items: MediaItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      sessionId,
      pageSize: '100',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }
    const response = await request<MediaItemsListResponse>(`/mediaItems?${params.toString()}`, accessToken, {
      method: 'GET',
    });
    const normalized = (response.mediaItems ?? [])
      .map(normalizePickedItem)
      .filter((item): item is MediaItem => Boolean(item));
    items.push(...normalized);
    pageToken = response.nextPageToken;
  } while (pageToken);

  return items;
}

function normalizePickedItem(item: RawPickedMediaItem): MediaItem | null {
  if (!item.id || !item.mediaFile?.baseUrl) {
    return null;
  }
  return {
    id: item.id,
    baseUrl: item.mediaFile.baseUrl,
    filename: item.mediaFile.filename ?? 'Google Photos item',
    mimeType: item.mediaFile.mimeType ?? 'application/octet-stream',
    width: item.mediaFile.mediaFileMetadata?.width?.toString(),
    height: item.mediaFile.mediaFileMetadata?.height?.toString(),
    type: item.type,
    createTime: item.createTime,
  };
}

function durationToMs(duration?: string): number | null {
  if (!duration) {
    return null;
  }
  const match = duration.match(/^([0-9]+(?:\.[0-9]+)?)s$/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 1000;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForMediaItems(options: {
  accessToken: string;
  sessionId: string;
  onProgress?: (message: string) => void;
  timeoutMs?: number;
}): Promise<MediaItem[]> {
  const { accessToken, sessionId, onProgress, timeoutMs = 120_000 } = options;
  let deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    onProgress?.('Waiting for Google Photos selection...');
    const session = await getPickerSession(accessToken, sessionId);

    if (session.mediaItemsSet) {
      return listPickedMediaItems(accessToken, sessionId);
    }

    const pollIntervalMs = durationToMs(session.pollingConfig?.pollInterval) ?? 2000;
    const timeoutSuggestion = durationToMs(session.pollingConfig?.timeoutIn);
    if (timeoutSuggestion) {
      deadline = Date.now() + timeoutSuggestion;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error('Timed out waiting for Google Photos selection.');
}
