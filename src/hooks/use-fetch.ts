"use client";
import { useEffect, useState } from "react";

export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState(url);

  // Ajustement de l'état quand l'URL change (pendant le rendu — pattern React)
  if (url !== prevUrl) {
    setPrevUrl(url);
    setData(null);
    setLoading(!!url);
    setError(null);
  }

  useEffect(() => {
    if (!url) return;
    let active = true;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error("Erreur réseau (" + r.status + ")");
        return r.json();
      })
      .then((d) => {
        if (active) {
          setData(d);
          setLoading(false);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [url]);

  return { data, loading, error };
}
