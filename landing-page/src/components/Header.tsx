"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "./Icon";

export function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_4px_20px_-4px_rgba(124,58,237,0.06)] transition-all">
      <div className="h-20 max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logo-with-name.png"
            alt="Dreambiz - Bigger Ideas Ahead"
            width={180}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#core-features" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
            Platform
          </Link>
          <Link href="#solutions" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
            Solutions
          </Link>
          <Link href="#how-it-works" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
            How it works
          </Link>
          <Link href="#about" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
            About
          </Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-4 shrink-0">
          <Link
            href="https://calendar.app.google/sFVi9ragoa8fguBM7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-11 px-5 rounded-xl font-semibold text-sm text-on-primary bg-gradient-to-r from-secondary-container via-primary-container to-primary shadow-[0_8px_24px_-4px_rgba(124,58,237,0.35)] hover:shadow-[0_12px_28px_-2px_rgba(124,58,237,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Book Demo
          </Link>
        </div>
      </div>
    </header>
  );
}
