"use client";

import React from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function Link({
  to,
  children,
  className,
  onClick
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <NextLink href={to} className={className} onClick={onClick}>
      {children}
    </NextLink>
  );
}

export function useLocation() {
  const pathname = usePathname();
  return { pathname };
}

export function useNavigate() {
  const router = useRouter();
  return (to: string) => router.push(to);
}

export function Outlet() {
  return null;
}
