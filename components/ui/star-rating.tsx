"use client";

import { useRef, useState } from "react";

const MAX_STARS = 5;
const STAR_INDEX = [1, 2, 3, 4, 5] as const;

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-8 w-8",
};

const sizePadding: Record<Size, string> = {
  sm: "p-0.5",
  md: "p-1",
  lg: "p-1",
};

function StarIcon({ filled, size }: { filled: boolean; size: Size }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${sizeClasses[size]} transition-colors ${
        filled
          ? "fill-rating text-rating"
          : "fill-transparent text-muted"
      }`}
    >
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M12 2.5l2.84 5.75 6.35.93-4.6 4.48 1.09 6.33L12 17.02l-5.68 2.97 1.09-6.33-4.6-4.48 6.35-.93L12 2.5z"
      />
    </svg>
  );
}

/**
 * Reusable 1–5 star rating input (no fractional stars).
 *
 * - Clicking the currently set star clears the rating
 * - Hover/focus previews the value that would be selected
 * - Keyboard: arrow keys move between stars, Enter/Space select, Home/End jump
 * - Exposes a radiogroup with proper labels; comfortable tap targets on mobile
 */
export function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
  label = "Puntuación",
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  disabled?: boolean;
  size?: Size;
  label?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const displayed = hovered ?? value ?? 0;

  const setRating = (next: number) => {
    if (disabled) return;
    onChange(value === next ? null : next);
  };

  const focusStar = (index: number) => {
    buttonRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = Math.min(MAX_STARS - 1, index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = Math.max(0, index - 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = MAX_STARS - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusStar(next);
  };

  const tabbableIndex = value == null ? 0 : value - 1;

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex w-fit items-center gap-0.5 ${
        disabled ? "opacity-70" : ""
      }`}
      onMouseLeave={() => setHovered(null)}
    >
      {STAR_INDEX.map((star) => {
        const index = star - 1;
        const filled = star <= displayed;
        return (
          <button
            key={star}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-label={`${star} de ${MAX_STARS} estrellas`}
            aria-checked={value === star}
            tabIndex={tabbableIndex === index ? 0 : -1}
            disabled={disabled}
            className={`${sizePadding[size]} rounded-full transition-transform active:scale-95 ${
              disabled ? "" : "hover:scale-110"
            }`}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(null)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => setRating(star)}
          >
            <StarIcon filled={filled} size={size} />
          </button>
        );
      })}
      {value !== null && !disabled ? (
        <button
          type="button"
          aria-label="Quitar puntuación"
          title="Quitar puntuación"
          className={`${sizePadding[size]} -ml-1 rounded-full text-muted transition-colors hover:text-foreground`}
          onClick={() => onChange(null)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={`${sizeClasses[size]} ${size === "sm" ? "h-4 w-4" : ""}`}>
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5.66 12.54-1.42 1.42L12 13.41l-4.24 4.24-1.42-1.42L10.59 12 6.34 7.76l1.42-1.42L12 10.59l4.24-4.24 1.42 1.42L13.41 12l4.25 4.24Z"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}