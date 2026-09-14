"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function TimezoneSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    let firstFrame = 0;
    let secondFrame = 0;

    if (hash.startsWith("#event-")) {
      const targetId = decodeURIComponent(hash.slice(1));
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          document
            .getElementById(targetId)
            ?.scrollIntoView({ block: "start" });
        });
      });
    }

    const params = new URLSearchParams(window.location.search);
    if (!params.has("tz")) {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (timeZone && timeZone !== "UTC") {
        params.set("tz", timeZone);
        router.replace(`${pathname}?${params.toString()}${hash}`, {
          scroll: false,
        });
      }
    }

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [pathname, router]);

  return null;
}
