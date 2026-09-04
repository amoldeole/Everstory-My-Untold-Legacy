import type { ReactElement } from "react";

export type IconComponent = (props: { className?: string }) => ReactElement;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const HomeIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <path d="M3.5 10.5 12 4l8.5 6.5V19a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1v-8.5Z" />
  </svg>
);

export const PenIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <path d="M16.5 3.9a2.1 2.1 0 0 1 3 3L8.4 18h-3v-3L16.5 3.9Z" />
    <path d="M4 21h16" />
  </svg>
);

export const BookIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 1 4 17v-11.5Z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 0 20 17v-11.5Z" />
  </svg>
);

export const LayersIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z" />
    <path d="M4 12.5 12 17l8-4.5" />
    <path d="M4 16.5 12 21l8-4.5" />
  </svg>
);

export const TimelineIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <path d="M12 4v16" />
    <circle cx="12" cy="7" r="2" />
    <circle cx="12" cy="17" r="2" />
    <path d="M14 7h6M4 17h6" />
  </svg>
);

export const PeopleIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 14.2a5.5 5.5 0 0 1 3.5 4.8" />
  </svg>
);

export const SparkIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <path d="M12 3.5l1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9L5.2 10.3l4.9-1.9L12 3.5Z" />
    <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
  </svg>
);

export const DownloadIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <path d="M12 4v11" />
    <path d="M7.5 11 12 15.5 16.5 11" />
    <path d="M4.5 19.5h15" />
  </svg>
);

export const SettingsIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M4.9 7.8l1.7 1M17.4 15.2l1.7 1M4.9 16.2l1.7-1M17.4 8.8l1.7-1" />
  </svg>
);

export const MenuIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const SunIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon: IconComponent = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

/** Icon keys are strings so nav config can cross the server/client boundary. */
export const NAV_ICONS: Record<string, IconComponent> = {
  home: HomeIcon,
  pen: PenIcon,
  book: BookIcon,
  layers: LayersIcon,
  timeline: TimelineIcon,
  people: PeopleIcon,
  spark: SparkIcon,
  download: DownloadIcon,
  settings: SettingsIcon,
  menu: MenuIcon,
  close: CloseIcon,
  sun: SunIcon,
  moon: MoonIcon,
};

export function navIcon(key: string): IconComponent {
  return NAV_ICONS[key] ?? BookIcon;
}
