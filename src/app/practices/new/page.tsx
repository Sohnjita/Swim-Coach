"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { PracticeForm } from "@/components/practice/PracticeForm";

export default function NewPracticePage() {
  return (
    <div>
      <PageHeader title="Log Practice" />
      <PracticeForm />
    </div>
  );
}
