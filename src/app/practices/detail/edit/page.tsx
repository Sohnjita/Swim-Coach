"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { PracticeForm } from "@/components/practice/PracticeForm";

export default function EditPracticePage() {
  return (
    <Suspense fallback={null}>
      <EditPractice />
    </Suspense>
  );
}

function EditPractice() {
  const id = useSearchParams().get("id") ?? "";
  const practice = useLiveQuery(() => db.practices.get(id), [id]);

  if (practice === undefined) return null;
  if (!practice) {
    return (
      <div className="p-4">
        <p className="text-sm text-text-tertiary">Practice not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Edit Practice" />
      <PracticeForm initial={practice} />
    </div>
  );
}
