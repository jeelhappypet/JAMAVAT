"use client";

import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing initial browser online/offline state
    setIsOffline(!navigator.onLine);

    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="w-full bg-danger text-white text-center text-sm font-medium py-1.5 px-3">
      તમે ઓફલાઇન છો — ડેટા સેવ થશે નહીં, જોડાણ પાછું આવે ત્યાં સુધી રાહ જુઓ
    </div>
  );
}
