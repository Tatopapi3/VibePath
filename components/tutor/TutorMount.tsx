"use client";

import { usePathname } from "next/navigation";
import TutorWidget from "./TutorWidget";

// The tutor rides along with the learning + building surfaces, not the
// marketing landing page.
const ROUTES = ["/build", "/learn", "/lesson", "/practice", "/journey"];

export default function TutorMount() {
  const pathname = usePathname();
  const show = ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (!show) return null;
  return <TutorWidget />;
}
