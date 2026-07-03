"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { PracticeForm } from "@/components/practice/PracticeForm";

export default function NewPracticePage() {
  return (
    <div>
      <PageHeader title="Log Practice" />
      <Suspense fallback={null}>
        <NewPracticeForm />
      </Suspense>
    </div>
  );
}

function NewPracticeForm() {
  const date = useSearchParams().get("date") ?? undefined;
  return <PracticeForm initialDate={date} />;
}
