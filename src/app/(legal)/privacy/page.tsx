import type { Metadata } from "next";

import { LegalDocument, loadLegalMarkdown } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy — FirstSeat",
};

export default async function PrivacyPage() {
  const source = await loadLegalMarkdown("privacy");

  return <LegalDocument source={source} />;
}
