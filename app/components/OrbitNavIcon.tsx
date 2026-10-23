import type { SVGProps } from "react";

/** Lightweight shared sidebar symbols; a single line icon language, no dependency. */
const paths = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3V10.5Z",
  crm: "M4 4h16v16H4z M8 9h8 M8 13h8 M8 17h5",
  students: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M16 5a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",
  batches: "M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4 M7 14h3v3H7z M14 14h3v3h-3z",
  trainers: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  payments: "M12 2v20 M16.5 6a4 4 0 0 0-4-2H10a3.5 3.5 0 0 0 0 7h4a3.5 3.5 0 0 1 0 7h-3a4.5 4.5 0 0 1-4-2",
  courses: "M4 5h7a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4z M20 5h-7a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h7z",
  lms: "M4 4h16v16H4z M9 8h6v8H9z M7 8h0 M17 8h0",
  reports: "M4 20V9 M10 20V4 M16 20v-9 M22 20V7",
  access: "M4 11h16v10H4z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2",
  portal: "M5 3h14v18H5z M10 12h8 M15 9l3 3-3 3",
  aqmatics: "M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2z"
} as const;

export type OrbitNavIconName = keyof typeof paths;

export default function OrbitNavIcon({
  name, ...props
}: { name: OrbitNavIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="19" height="19" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      focusable="false" aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
