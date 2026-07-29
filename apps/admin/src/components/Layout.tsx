import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ps-cinza-claro">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
