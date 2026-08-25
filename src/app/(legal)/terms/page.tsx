import type { Metadata } from "next";

import { LegalDocument, loadLegalMarkdown } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service — FirstSeat",
};

export default async function TermsPage() {
  const source = await loadLegalMarkdown("terms");

  return <LegalDocument source={source} />;
}
