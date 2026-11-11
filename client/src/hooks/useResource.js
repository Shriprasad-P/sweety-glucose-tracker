import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useResource(path) {
  const [state, setState] = useState(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const abort = new AbortController();
    api(path, { signal: abort.signal })
      .then((data) => {
        if (!abort.signal.aborted) setState({ path, revision, data });
      })
      .catch((error) => {
        if (!abort.signal.aborted)
          setState({ path, revision, error: error.message });
      });
    return () => abort.abort();
  }, [path, revision]);

  const current =
    state?.path === path && state?.revision === revision ? state : null;
  return {
    loading: !current,
    data: current?.data,
    error: current?.error,
    retry: reload,
  };
}
