"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { HomeCalendar } from "@/components/home/HomeCalendar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatDateLabel, todayISO } from "@/lib/format";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Swim Coach" subtitle={formatDateLabel(todayISO())} />

      <div className="space-y-4 p-4">
        <HomeCalendar />

        <div className="flex items-center justify-end px-1">
          <Link href="/calendar" className="text-xs text-accent">
            Full calendar
          </Link>
        </div>

        <Link href="/practices/new">
          <Button className="w-full">
            <Plus size={18} /> Log a practice
          </Button>
        </Link>
      </div>
    </div>
  );
}
