"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./studio-switcher.module.css";

const links = [
  { href: "/", label: "Single CLR" },
  { href: "/bulk", label: "Bulk Import" },
];

export function StudioSwitcher() {
  const pathname = usePathname();

  return (
    <nav className={styles.switcher} aria-label="Studio mode">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`${styles.link} ${pathname === link.href ? styles.active : ""}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
