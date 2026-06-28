import { Suspense } from "react";
import { IssuesClient } from "@/components/issues/IssuesClient";
import { Spinner } from "@/components/ui/misc";

export default function IssuesPage() {
  return (
    <Suspense fallback={<div className="p-6"><Spinner /></div>}>
      <IssuesClient />
    </Suspense>
  );
}
