import { useEffect, useState } from 'react';
import type { MediaItem } from '../types/googlePhotos';
import { createPickerSession, waitForMediaItems } from '../services/googlePhotosPicker';

type PhotoPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  onPicked: (items: MediaItem[]) => void;
  ensureAccessToken: () => Promise<string>;
};

type DialogState = 'idle' | 'creating' | 'polling' | 'error';

export function PhotoPickerDialog({ open, onClose, onPicked, ensureAccessToken }: PhotoPickerDialogProps) {
  const [status, setStatus] = useState<DialogState>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setMessage('');
      setError(null);
      return;
    }

    let isCancelled = false;

    const launchPicker = async () => {
      try {
        setStatus('creating');
        setMessage('Requesting Google Photos Picker...');
        const accessToken = await ensureAccessToken();
        const session = await createPickerSession(accessToken);

        if (!session.id || !session.pickerUri) {
          throw new Error('Picker session response missing id or pickerUri.');
        }

        const pickerUrl = session.pickerUri.endsWith('/autoclose')
          ? session.pickerUri
          : `${session.pickerUri.replace(/\/$/, '')}/autoclose`;
        window.open(pickerUrl, 'google-photos-picker', 'width=480,height=720');

        setStatus('polling');
        const items = await waitForMediaItems({
          accessToken,
          sessionId: session.id,
          onProgress: (progressMessage) => {
            if (!isCancelled) {
              setMessage(progressMessage);
            }
          },
        });

        if (!isCancelled) {
          onPicked(items);
        }
      } catch (pickerError) {
        if (isCancelled) {
          return;
        }
        setStatus('error');
        setError(pickerError instanceof Error ? pickerError.message : 'Unknown picker error');
      }
    };

    void launchPicker();

    return () => {
      isCancelled = true;
    };
  }, [open, ensureAccessToken, onPicked]);

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true">
      <div className="dialog-panel">
        <div className="dialog-header">
          <h2>Select Google Photos</h2>
          <button type="button" onClick={onClose} aria-label="Close picker dialog">
            ×
          </button>
        </div>
        <div className="dialog-body">
          {status === 'error' ? <p className="dialog-error">{error}</p> : <p>{message || 'Waiting for selection...'}</p>}
          <p className="dialog-hint">If you do not see the Google window, enable pop-ups for this site.</p>
        </div>
      </div>
    </div>
  );
}
