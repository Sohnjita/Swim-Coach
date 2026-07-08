"use client";

import Link from "next/link";
import { HomeCalendar } from "@/components/home/HomeCalendar";
import { PowerIndex } from "@/components/home/PowerIndex";
import { SetRecommendationCard } from "@/components/home/SetRecommendationCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateLabel, todayISO } from "@/lib/format";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Swim Coach" subtitle={formatDateLabel(todayISO())} />

      <div className="space-y-4 p-4">
        <SetRecommendationCard />

        <HomeCalendar />

        <div className="flex items-center justify-end px-1">
          <Link href="/calendar" className="text-xs text-accent">
            Full calendar
          </Link>
        </div>

        <PowerIndex />
      </div>
    </div>
  );
}
