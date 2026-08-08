type IconName = "briefcase" | "store" | "chart" | "home" | "shield" | "people" | "arrow" | "check" | "whatsapp" | "menu";

export function Icon({ name, size = 22 }: { name: IconName | string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<string, React.ReactNode> = {
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></>,
    store: <><path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6"/><path d="M8 20v-6h8v6"/></>,
    chart: <><path d="M4 19V9M10 19V5M16 19v-8M22 19H2"/></>,
    home: <><path d="M3 11 12 3l9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-7h6v7"/></>,
    shield: <><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-5"/></>,
    people: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.3-7 6-7s6 3 6 7"/><circle cx="17" cy="9" r="2"/><path d="M16 14c3 0 5 2.3 5 6"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    whatsapp: <><path d="M20.5 11.7A8.5 8.5 0 0 1 8 19.2L3 21l1.7-4.9A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="M8.5 7.5c.5 2.8 2.2 4.6 5 5.4"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  };
  return <svg {...common}>{paths[name] || paths.arrow}</svg>;
}
