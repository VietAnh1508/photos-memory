import { useCallback, useEffect, useMemo, useState } from 'react';
import { PhotoPickerDialog } from './components/PhotoPickerDialog';
import { usePhotosToken } from './hooks/usePhotosToken';
import type { MediaItem } from './types/googlePhotos';
import { loadMediaItems, saveMediaItems, clearMediaItems } from './services/localMediaStore';

const heroCopy = {
  title: 'Photos Memory',
  subtitle: 'Choose favorites from Google Photos, then we surprise you with one every time you visit.',
};

function pickRandom(items: MediaItem[]): MediaItem | null {
  if (!items.length) {
    return null;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function buildRenderUrl(baseUrl: string) {
  const width = typeof window !== 'undefined' ? Math.ceil(window.innerWidth * 1.5) : 1920;
  const height = typeof window !== 'undefined' ? Math.ceil(window.innerHeight * 1.5) : 1080;
  return `${baseUrl}=w${width}-h${height}-no`;
}

const captureDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function parseCreateTime(createTime?: string) {
  if (!createTime) {
    return null;
  }
  const date = new Date(createTime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatCaptureDate(createTime?: string) {
  const date = parseCreateTime(createTime);
  if (!date) {
    return null;
  }
  return captureDateFormatter.format(date);
}

function formatMemoryHeadline(createTime?: string) {
  const date = parseCreateTime(createTime);
  if (!date) {
    return null;
  }
  const now = new Date();
  const sameMonthDay = date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const yearDiff = now.getFullYear() - date.getFullYear();

  if (sameMonthDay && yearDiff > 0) {
    const years = yearDiff === 1 ? 'one year' : `${yearDiff} years`;
    return `On this day, ${years} ago`;
  }

  return null;
}

export default function App() {
  const cached = useMemo(() => loadMediaItems(), []);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(cached);
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(() => pickRandom(cached));
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { ensureAccessToken, startSignIn, isFetching, hasSession, lastError } = usePhotosToken();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const memoryHeadline = useMemo(() => formatMemoryHeadline(currentItem?.createTime), [currentItem?.createTime]);
  const captureDateLabel = useMemo(() => formatCaptureDate(currentItem?.createTime), [currentItem?.createTime]);

  const handlePickerComplete = useCallback(
    (items: MediaItem[]) => {
      saveMediaItems(items);
      setMediaItems(items);
      setCurrentItem(pickRandom(items));
      setDialogOpen(false);
    },
    [],
  );

  const handleShuffle = useCallback(() => {
    setCurrentItem(pickRandom(mediaItems));
  }, [mediaItems]);

  const handleReset = useCallback(() => {
    clearMediaItems();
    setMediaItems([]);
    setCurrentItem(null);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | null = null;

    const hydratePhoto = async () => {
      if (!currentItem) {
        setPhotoUrl(null);
        setPhotoError(null);
        setPhotoLoading(false);
        return;
      }

      setPhotoLoading(true);
      setPhotoError(null);
      setPhotoUrl(null);

      try {
        const token = await ensureAccessToken();
        if (isCancelled) {
          return;
        }

        const response = await fetch(buildRenderUrl(currentItem.baseUrl), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load photo (${response.status})`);
        }

        const blob = await response.blob();
        if (isCancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      } catch (loadError) {
        if (isCancelled) {
          return;
        }
        setPhotoUrl(null);
        setPhotoError(loadError instanceof Error ? loadError.message : 'Unable to load photo.');
      } finally {
        if (!isCancelled) {
          setPhotoLoading(false);
        }
      }
    };

    void hydratePhoto();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [currentItem, ensureAccessToken, isFetching]);

  const hasMedia = mediaItems.length > 0;

  return (
    <main className="app-shell">
      {currentItem ? (
        <div className="photo-stage">
          {photoUrl ? (
            <img src={photoUrl} alt={currentItem.description || currentItem.filename} />
          ) : (
            <div className="photo-placeholder">
              <p>{photoError ?? (photoLoading ? 'Preparing your photo…' : 'Authorize to view your photo.')}</p>
            </div>
          )}
          {(memoryHeadline || captureDateLabel) && (
            <div className="memory-caption">
              {memoryHeadline && <p className="memory-caption__headline">{memoryHeadline}</p>}
              {captureDateLabel && <p className="memory-caption__date">{captureDateLabel}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="hero">
          <p className="eyebrow">Google Photos experiment</p>
          <h1>{heroCopy.title}</h1>
          <p className="subtitle">{heroCopy.subtitle}</p>
        </div>
      )}

      <div className="control-bar">
        {!hasMedia && <p className="notice">Pick at least one photo to get started.</p>}
        {(lastError || photoError) && <p className="error">{photoError ?? lastError}</p>}
        <div className="actions">
          {hasSession === false ? (
            <button type="button" onClick={startSignIn} disabled={photoLoading || isFetching}>
              Sign in with Google
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setDialogOpen(true)} disabled={photoLoading || isFetching}>
                {hasMedia ? 'Update selection' : 'Select photos'}
              </button>
              <button type="button" onClick={handleShuffle} disabled={!hasMedia || photoLoading || isFetching}>
                Shuffle
              </button>
              <button type="button" onClick={handleReset} disabled={!hasMedia || photoLoading || isFetching}>
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      <PhotoPickerDialog
        open={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        onPicked={handlePickerComplete}
        ensureAccessToken={ensureAccessToken}
      />
    </main>
  );
}
