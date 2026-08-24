"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }).catch(() => {
      // PWA enhancements are optional; the networked site still works.
    });
  }, []);
  return null;
}
