"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Upload } from "lucide-react";
import { db, getProfile, getScoringConfig } from "@/lib/db";
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring";
import { buildBackup, downloadBackup, parseBackupFile, restoreBackup } from "@/lib/backup";
import type { ScoringConfig, SwimmerProfile } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";

export default function SettingsPage() {
  const profileQuery = useLiveQuery(() => getProfile(), []);
  const configQuery = useLiveQuery(() => getScoringConfig(), []);

  if (!profileQuery || !configQuery) return null;

  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsForm initialProfile={profileQuery} initialConfig={configQuery} />
    </div>
  );
}

function SettingsForm({
  initialProfile,
  initialConfig,
}: {
  initialProfile: SwimmerProfile;
  initialConfig: ScoringConfig;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [config, setConfig] = useState(initialConfig);
  const [saved, setSaved] = useState(false);

  async function save() {
    await db.profile.put(profile);
    await db.scoringConfig.put(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function resetFormula() {
    setConfig({ ...DEFAULT_SCORING_CONFIG });
  }

  return (
    <>
      <div className="space-y-6 p-4 pb-24">
        <div className="divide-y divide-border/40 [&>*+*]:pt-6">
        <Card>
          <CardTitle className="mb-3">Profile</CardTitle>
          <div className="space-y-3">
            <Field label="Name">
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Birthdate">
                <Input
                  type="date"
                  value={profile.birthdate ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, birthdate: e.target.value || null })
                  }
                />
              </Field>
              <Field label="Gender">
                <Select
                  value={profile.gender}
                  onChange={(e) =>
                    setProfile({ ...profile, gender: e.target.value as "M" | "F" })
                  }
                >
                  <option value="M">Men</option>
                  <option value="F">Women</option>
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        <BackupCard />

        <Card>
          <CardTitle className="mb-1">Scoring formula</CardTitle>
          <p className="mb-3 text-xs text-text-tertiary">
            These weights and estimates drive your practice score and goal
            prediction. They&apos;re heuristics tuned for transparency, not a
            validated sports-science model — adjust them as you learn what
            correlates with your own racing.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              label="Pace weight"
              value={config.paceWeight}
              onChange={(v) => setConfig({ ...config, paceWeight: v })}
              step={0.05}
            />
            <NumberField
              label="Efficiency weight"
              value={config.efficiencyWeight}
              onChange={(v) => setConfig({ ...config, efficiencyWeight: v })}
              step={0.05}
            />
            <NumberField
              label="Effort weight"
              value={config.effortWeight}
              onChange={(v) => setConfig({ ...config, effortWeight: v })}
              step={0.05}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <NumberField
              label="Taper drop %"
              value={config.taperDropPercent}
              onChange={(v) => setConfig({ ...config, taperDropPercent: v })}
              step={0.1}
            />
            <NumberField
              label="Tech suit drop %"
              value={config.techSuitDropPercent}
              onChange={(v) => setConfig({ ...config, techSuitDropPercent: v })}
              step={0.1}
            />
            <NumberField
              label="Dive advantage (s)"
              value={config.diveAdvantageSeconds}
              onChange={(v) => setConfig({ ...config, diveAdvantageSeconds: v })}
              step={0.05}
            />
          </div>

          <p className="mt-4 mb-2 text-xs font-medium text-text-tertiary">
            Course conversion to LCM (%)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="50 Breast, SCY→LCM"
              value={config.scyToLcmPercent["50 Breast"]}
              onChange={(v) =>
                setConfig({
                  ...config,
                  scyToLcmPercent: { ...config.scyToLcmPercent, "50 Breast": v },
                })
              }
              step={0.5}
            />
            <NumberField
              label="100 Breast, SCY→LCM"
              value={config.scyToLcmPercent["100 Breast"]}
              onChange={(v) =>
                setConfig({
                  ...config,
                  scyToLcmPercent: { ...config.scyToLcmPercent, "100 Breast": v },
                })
              }
              step={0.5}
            />
            <NumberField
              label="50 Breast, SCM→LCM"
              value={config.scmToLcmPercent["50 Breast"]}
              onChange={(v) =>
                setConfig({
                  ...config,
                  scmToLcmPercent: { ...config.scmToLcmPercent, "50 Breast": v },
                })
              }
              step={0.5}
            />
            <NumberField
              label="100 Breast, SCM→LCM"
              value={config.scmToLcmPercent["100 Breast"]}
              onChange={(v) =>
                setConfig({
                  ...config,
                  scmToLcmPercent: { ...config.scmToLcmPercent, "100 Breast": v },
                })
              }
              step={0.5}
            />
          </div>

          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={resetFormula}>
            Reset to defaults
          </Button>
        </Card>
        </div>

        <Button className="w-full" onClick={save}>
          {saved ? "Saved" : "Save settings"}
        </Button>
      </div>
    </>
  );
}

type RestoreStatus = { kind: "success"; count: number } | { kind: "error"; message: string };

function BackupCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [status, setStatus] = useState<RestoreStatus | null>(null);

  async function handleExport() {
    setExporting(true);
    const payload = await buildBackup();
    downloadBackup(payload);
    setExporting(false);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setStatus(null);
    try {
      const text = await file.text();
      const payload = parseBackupFile(text);
      const count =
        payload.practices.length +
        payload.setTemplates.length +
        payload.calendarEvents.length +
        payload.standards.length +
        payload.meetResults.length;
      if (
        !confirm(
          `Restore ${count} record(s) from this backup? Records already on this device with a matching id will be overwritten; everything else stays as-is.`,
        )
      ) {
        return;
      }
      setRestoring(true);
      await restoreBackup(payload);
      setStatus({ kind: "success", count });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Restore failed." });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Card>
      <CardTitle className="mb-1">Backup &amp; restore</CardTitle>
      <p className="mb-3 text-xs text-text-tertiary">
        All your data lives only on this device. Export a backup file
        regularly so it isn&apos;t lost if you clear your browser or switch
        phones — restoring loads a backup file back in.
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download size={14} /> {exporting ? "Exporting..." : "Export backup"}
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={restoring}
        >
          <Upload size={14} /> {restoring ? "Restoring..." : "Restore from file"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>
      {status?.kind === "success" && (
        <p className="mt-2 text-xs text-accent">Restored {status.count} record(s).</p>
      )}
      {status?.kind === "error" && (
        <p className="mt-2 text-xs text-danger">{status.message}</p>
      )}
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
}) {
  return (
    <label className="text-xs text-text-tertiary">
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-9 w-full rounded-lg border border-border bg-bg-elevated-2 px-2 text-sm text-text-primary outline-none focus:border-accent"
      />
    </label>
  );
}
