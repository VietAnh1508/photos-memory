export type MediaItem = {
  id: string;
  filename: string;
  description?: string;
  mimeType: string;
  baseUrl: string;
  productUrl?: string;
  width?: string;
  height?: string;
  createTime?: string;
  type?: 'PHOTO' | 'VIDEO' | 'TYPE_UNSPECIFIED';
};

export type PickerSession = {
  id: string;
  state: 'SESSION_STATE_UNSPECIFIED' | 'SESSION_STATE_IN_PROGRESS' | 'SESSION_STATE_COMPLETED' | 'SESSION_STATE_FAILED';
  updateTime: string;
  mediaItems: MediaItem[];
  retryAfterSeconds?: number;
};
