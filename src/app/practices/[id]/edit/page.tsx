"use client";

import { use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { PracticeForm } from "@/components/practice/PracticeForm";

export default function EditPracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
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
