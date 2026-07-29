import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function PwaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ps-cinza-claro pb-20">
      <div className="max-w-md mx-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
