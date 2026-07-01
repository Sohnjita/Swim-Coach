"use client";

import { useEffect } from "react";
import { ensureSingletons } from "@/lib/db";

/** Creates the profile/scoring-config rows once on first client mount. */
export default function DbBootstrap() {
  useEffect(() => {
    ensureSingletons();
  }, []);
  return null;
}
