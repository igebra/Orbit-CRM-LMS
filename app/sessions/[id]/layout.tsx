import type { ReactNode } from "react";
import SessionFileDock from "./SessionFileDock";

export default function SessionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SessionFileDock />
    </>
  );
}
