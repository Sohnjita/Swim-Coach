"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getProfile, getScoringConfig } from "@/lib/db";
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring";
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
      <div className="space-y-4 p-4 pb-24">
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

        <Button className="w-full" onClick={save}>
          {saved ? "Saved" : "Save settings"}
        </Button>
      </div>
    </>
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
