import { useEffect, useState } from 'react';

type ScriptStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useScript(src: string): ScriptStatus {
  const [status, setStatus] = useState<ScriptStatus>('idle');

  useEffect(() => {
    if (!src) {
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    const handleLoad = () => {
      script?.setAttribute('data-loaded', 'true');
      setStatus('ready');
    };

    const handleError = () => {
      setStatus('error');
    };

    if (!script) {
      script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      setStatus('loading');
      document.head.appendChild(script);
    } else if (script.getAttribute('data-loaded') === 'true') {
      setStatus('ready');
    } else {
      setStatus('loading');
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
    }

    return () => {
      script?.removeEventListener('load', handleLoad);
      script?.removeEventListener('error', handleError);
    };
  }, [src]);

  return status;
}
