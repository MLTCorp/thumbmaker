"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ThreeColumnLayoutProps {
  /** Left column content (width: 320px) */
  leftColumn?: React.ReactNode;
  /** Center column content (flex-1, expandable) */
  centerColumn: React.ReactNode;
  /** Right column content (width: 360px) */
  rightColumn?: React.ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * ThreeColumnLayout
 *
 * Responsive 3-column layout for the /generate page.
 *
 * Desktop (≥1024px): 3 columns side-by-side
 * - Column 1 (left): 320px width, white background
 * - Column 2 (center): flex-1 (expandable), gray-50 background
 * - Column 3 (right): 360px width, white background
 *
 * Mobile (<1024px): Stacks vertically with single page scroll
 */
export function ThreeColumnLayout({
  leftColumn,
  centerColumn,
  rightColumn,
  className,
}: ThreeColumnLayoutProps) {
  return (
    <div
      className={cn(
        "flex flex-col lg:flex-row w-full transition-all duration-300",
        "lg:h-[calc(100vh-12rem)]", // Desktop: Full viewport height minus header
        className
      )}
    >
      {/* Column 1 (Left): Avatar and References Selection */}
      {leftColumn && (
        <div className="w-full lg:w-[320px] bg-white lg:border-r border-gray-200 transition-all duration-300">
          {/* Desktop: ScrollArea with independent scroll */}
          <div className="hidden lg:block h-full">
            <ScrollArea className="h-full overflow-y-auto">
              <div className="p-6">
                {leftColumn}
              </div>
            </ScrollArea>
          </div>
          {/* Mobile: No ScrollArea, single page scroll, reduced padding */}
          <div className="block lg:hidden">
            <div className="p-4">
              {leftColumn}
            </div>
          </div>
        </div>
      )}

      {/* Column 2 (Center): Prompt Configuration and Generation */}
      <div className="flex-1 bg-gray-50 transition-all duration-300">
        {/* Desktop: ScrollArea with independent scroll */}
        <div className="hidden lg:block h-full">
          <ScrollArea className="h-full overflow-y-auto">
            <div className="p-6">
              {centerColumn}
            </div>
          </ScrollArea>
        </div>
        {/* Mobile: No ScrollArea, single page scroll, reduced padding */}
        <div className="block lg:hidden">
          <div className="p-4">
            {centerColumn}
          </div>
        </div>
      </div>

      {/* Column 3 (Right): History Grid */}
      {rightColumn && (
        <div className="w-full lg:w-[360px] bg-white lg:border-l border-gray-200 transition-all duration-300">
          {/* Desktop: ScrollArea with independent scroll */}
          <div className="hidden lg:block h-full">
            <ScrollArea className="h-full overflow-y-auto">
              <div className="p-6">
                {rightColumn}
              </div>
            </ScrollArea>
          </div>
          {/* Mobile: No ScrollArea, single page scroll, reduced padding */}
          <div className="block lg:hidden">
            <div className="p-4">
              {rightColumn}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
