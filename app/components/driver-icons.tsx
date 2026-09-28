import type { ReactNode, SVGProps } from "react";
export function DriverIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: string }) {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    route: <><path {...line} d="M5 19c5 0 3-14 9-14 3 0 5 2 5 5s-2 5-5 5H9"/><circle {...line} cx="5" cy="19" r="2"/><circle {...line} cx="14" cy="5" r="2"/></>,
    orders: <><path {...line} d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/></>,
    history: <><circle {...line} cx="12" cy="12" r="9"/><path {...line} d="M12 7v5l3 2M5 5 3 1"/></>,
    profile: <><circle {...line} cx="12" cy="8" r="4"/><path {...line} d="M4 21c0-5 3-8 8-8s8 3 8 8"/></>,
    logout: <><path {...line} d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></>,
    back: <path {...line} d="m15 18-6-6 6-6"/>,
    locate: <><circle {...line} cx="12" cy="12" r="3"/><circle {...line} cx="12" cy="12" r="8"/><path {...line} d="M12 2v2M12 20v2M2 12h2M20 12h2"/></>,
    optimize: <><path {...line} d="M4 7h11M4 17h16M15 4l3 3-3 3M9 14l-3 3 3 3"/></>,
    phone: <path {...line} d="M7 3 4 5c-1 1 1 6 5 10s9 6 10 5l2-3-5-3-2 2c-2-1-5-4-6-6l2-2-3-5Z"/>,
    warning: <><path {...line} d="M12 3 2.5 20h19L12 3Z"/><path {...line} d="M12 9v4M12 17h.01"/></>,
    close: <path {...line} d="m6 6 12 12M18 6 6 18"/>,
    chevron: <path {...line} d="m9 18 6-6-6-6"/>,
    menu: <path {...line} d="M4 7h16M4 12h16M4 17h16"/>,
    note: <><path {...line} d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
