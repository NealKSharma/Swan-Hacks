import { redirect } from "next/navigation";

export default function HomePage() {
  // Root is only a fallback for testing. Real QR codes should point directly to
  // /report/[location-slug], so users land on the report form right away.
  redirect("/report/parks-library");
}
