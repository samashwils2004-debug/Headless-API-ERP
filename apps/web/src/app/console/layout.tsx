import type { ReactNode } from "react";

import { ConsoleProvider } from "@/components/console/ConsoleProvider";
import { ConsoleShell } from "@/components/console/ConsoleShell";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <ConsoleProvider>
      <ConsoleShell>{children}</ConsoleShell>
    </ConsoleProvider>
  );
}
