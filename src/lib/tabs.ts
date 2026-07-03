export interface TabDef {
  href: string;
  label: string;
}

export const TABS: TabDef[] = [
  { href: "/", label: "Home" },
  { href: "/times", label: "Times" },
  { href: "/practices", label: "Practices" },
  { href: "/analyze", label: "Analyze" },
  { href: "/settings", label: "Settings" },
];
