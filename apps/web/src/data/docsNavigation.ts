import type { DocNavItem } from "../types";

import { DOC_NAV_GROUPS } from "./docs";

export const docsNavigation: DocNavItem[] = DOC_NAV_GROUPS.map((group) => ({
  label: group.label,
  children: group.items.map((item) => ({
    label: item.label,
    href: item.href,
  })),
}));
