import { useState, useRef, useEffect, useCallback } from "react";
import {
  EMOJI_ALPHABET,
  EMOJI_ID_LENGTH,
} from "../constants/emoji-alphabet";

interface EmojiPickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

/**
 * Splits a string into an array of individual emoji.
 * Handles multi-codepoint emoji (e.g. ❤️, ✈️) via Intl.Segmenter
 * with a regex fallback for older browsers.
 */
function splitEmoji(str: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return [...segmenter.segment(str)].map((s) => s.segment);
  }
  const matches = str.match(
    /\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*/gu
  );
  return matches ?? [];
}

/**
 * Human-readable names for each emoji in the alphabet.
 * Used for search filtering and screen reader labels.
 * Order must match EMOJI_ALPHABET.
 */
const EMOJI_NAMES: readonly string[] = [
  // Animals (24)
  "dog", "cat", "mouse", "hamster", "rabbit", "fox", "bear", "panda",
  "koala", "tiger", "lion", "cow", "pig", "frog", "monkey", "chicken",
  "penguin", "bird", "duck", "eagle", "owl", "bat", "wolf", "boar",
  // Sea & nature creatures (8)
  "octopus", "squid", "crab", "blowfish", "dolphin", "whale", "butterfly", "turtle",
  // Food & drink (24)
  "apple", "orange", "lemon", "grapes", "strawberry", "cherry", "kiwi", "avocado",
  "pizza", "burger", "taco", "noodles", "sushi", "ice cream", "cake", "doughnut",
  "cookie", "croissant", "cheese", "egg", "corn", "carrot", "mushroom", "ice",
  // Nature (16)
  "cherry blossom", "sunflower", "rose", "herb", "clover", "maple leaf", "fallen leaf", "wave",
  "moon", "star", "rainbow", "lightning", "fire", "snowflake", "earth", "volcano",
  // Objects (24)
  "football", "basketball", "tennis", "trophy", "target", "dice", "game controller", "guitar",
  "trumpet", "drum", "palette", "camera", "telescope", "microscope", "light bulb", "key",
  "anchor", "magnet", "gem", "vase", "puzzle", "wand", "circus", "carousel",
  // Travel & places (16)
  "rocket", "airplane", "train", "sailboat", "helicopter", "house", "castle", "tent",
  "map", "compass", "mountain", "sunrise", "ferris wheel", "tower", "stadium", "bridge",
  // Symbols & misc (16)
  "purple heart", "yellow heart", "green heart", "blue heart", "orange heart", "red heart", "black heart", "white heart",
  "sun", "cyclone", "dizzy", "shooting star", "fireworks", "sparkler", "sparkles", "saturn",
] as const;

/** Paired emoji + name for filtering. */
const EMOJI_ENTRIES = EMOJI_ALPHABET.map((emoji, i) => ({
  emoji,
  name: EMOJI_NAMES[i] ?? "",
}));

const GRID_COLS = 8;

export function EmojiPicker({ value, onChange, id }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusIndex, setFocusIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  const emojiChars = splitEmoji(value);
  const isFull = emojiChars.length >= EMOJI_ID_LENGTH;

  // Filter emoji by search term
  const filtered = search.trim()
    ? EMOJI_ENTRIES.filter((e) =>
        e.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : EMOJI_ENTRIES;

  // Announce selection changes to screen readers
  const announce = useCallback((message: string) => {
    if (announceRef.current) {
      announceRef.current.textContent = message;
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape, focus management
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto-focus search when opened, reset state when closed
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is rendered
      requestAnimationFrame(() => {
        searchRef.current?.focus();
      });
    } else {
      setSearch("");
      setFocusIndex(-1);
    }
  }, [isOpen]);

  // Keep focusIndex in bounds when filtered results change
  useEffect(() => {
    if (focusIndex >= filtered.length) {
      setFocusIndex(filtered.length > 0 ? 0 : -1);
    }
  }, [filtered.length, focusIndex]);

  const handleEmojiClick = (emoji: string, name: string) => {
    if (isFull) return;
    const next = value + emoji;
    onChange(next);
    const count = emojiChars.length + 1;
    announce(`${name} selected. ${count} of ${EMOJI_ID_LENGTH} emoji chosen.`);
    // Auto-close when ID is complete
    if (count >= EMOJI_ID_LENGTH) {
      setIsOpen(false);
      announce(`Emoji ID complete: ${next}`);
    }
  };

  const handleBackspace = () => {
    if (emojiChars.length === 0) return;
    const removed = emojiChars[emojiChars.length - 1];
    onChange(emojiChars.slice(0, -1).join(""));
    announce(`Removed ${removed}. ${emojiChars.length - 1} of ${EMOJI_ID_LENGTH} emoji chosen.`);
  };

  const handleClear = () => {
    onChange("");
    announce("Emoji ID cleared.");
  };

  // Keyboard navigation within the grid
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (filtered.length === 0) return;

    let nextIndex = focusIndex;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        nextIndex = focusIndex + 1 >= filtered.length ? 0 : focusIndex + 1;
        break;
      case "ArrowLeft":
        e.preventDefault();
        nextIndex = focusIndex - 1 < 0 ? filtered.length - 1 : focusIndex - 1;
        break;
      case "ArrowDown":
        e.preventDefault();
        nextIndex = focusIndex + GRID_COLS >= filtered.length
          ? focusIndex % GRID_COLS < filtered.length % GRID_COLS
            ? filtered.length - (filtered.length % GRID_COLS) + (focusIndex % GRID_COLS)
            : focusIndex % GRID_COLS
          : focusIndex + GRID_COLS;
        if (nextIndex >= filtered.length) nextIndex = focusIndex % GRID_COLS;
        break;
      case "ArrowUp":
        e.preventDefault();
        nextIndex = focusIndex - GRID_COLS < 0
          ? filtered.length - GRID_COLS + (focusIndex % GRID_COLS)
          : focusIndex - GRID_COLS;
        if (nextIndex < 0 || nextIndex >= filtered.length) nextIndex = focusIndex;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = filtered.length - 1;
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < filtered.length && !isFull) {
          const entry = filtered[focusIndex];
          handleEmojiClick(entry.emoji, entry.name);
        }
        return;
      default:
        return;
    }

    setFocusIndex(nextIndex);
    // Scroll the focused button into view
    const btn = gridRef.current?.querySelector(
      `[data-index="${nextIndex}"]`
    ) as HTMLElement | null;
    btn?.scrollIntoView({ block: "nearest" });
  };

  // Handle search keyboard: arrow down moves into grid
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && filtered.length > 0) {
      e.preventDefault();
      setFocusIndex(0);
      gridRef.current?.focus();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      // Select first filtered result if only one match
      if (filtered.length === 1 && !isFull) {
        handleEmojiClick(filtered[0].emoji, filtered[0].name);
        setSearch("");
      }
    }
  };

  const toggleId = id ? `${id}-toggle` : "emoji-picker-toggle";
  const dropdownId = id ? `${id}-dropdown` : "emoji-picker-dropdown";
  const searchId = id ? `${id}-search` : "emoji-picker-search";

  return (
    <div ref={containerRef} className="relative" id={id}>
      {/* Screen reader live region for announcements */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        role="status"
      />

      {/* Display / toggle area */}
      <div className="flex items-center gap-2">
        <button
          id={toggleId}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="input flex flex-1 cursor-pointer items-center justify-center gap-1 text-center text-2xl"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-controls={isOpen ? dropdownId : undefined}
          aria-label={
            value
              ? `Emoji ID: ${emojiChars
                  .map((e) => {
                    const entry = EMOJI_ENTRIES.find((en) => en.emoji === e);
                    return entry ? entry.name : e;
                  })
                  .join(", ")}. Click to ${isOpen ? "close" : "change"}.`
              : "Click to pick your Emoji ID"
          }
        >
          {emojiChars.length > 0 ? (
            <span className="emoji-spaced">{value}</span>
          ) : (
            <span className="text-sm text-content-muted">
              Click to pick {EMOJI_ID_LENGTH} emoji
            </span>
          )}
        </button>

        {emojiChars.length > 0 && (
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={handleBackspace}
              className="rounded px-2 py-1 text-xs text-content-muted hover:bg-surface-overlay hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label={`Remove last emoji (${emojiChars[emojiChars.length - 1]})`}
            >
              Undo
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded px-2 py-1 text-xs text-content-muted hover:bg-surface-overlay hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Clear all emoji"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <p className="label-hint mt-1" aria-live="polite">
        {emojiChars.length} of {EMOJI_ID_LENGTH} emoji selected
      </p>

      {/* Picker dropdown */}
      {isOpen && (
        <div
          id={dropdownId}
          className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-border bg-surface-overlay shadow-lg"
          role="dialog"
          aria-label="Emoji picker"
          aria-modal="false"
        >
          {/* Search input */}
          <div className="border-b border-border p-2">
            <label htmlFor={searchId} className="sr-only">
              Search emoji by name
            </label>
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search (e.g. dog, pizza, rocket)"
              className="input-dark text-sm"
              autoComplete="off"
              aria-describedby={`${searchId}-hint`}
            />
            <p id={`${searchId}-hint`} className="sr-only">
              Type to filter emoji. Press down arrow to browse results.
            </p>
          </div>

          {/* Emoji grid */}
          <div
            ref={gridRef}
            className="max-h-52 overflow-y-auto p-2"
            role="grid"
            aria-label={`${filtered.length} emoji available. Use arrow keys to browse.`}
            tabIndex={focusIndex >= 0 ? 0 : -1}
            onKeyDown={handleGridKeyDown}
          >
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-content-muted">
                No emoji match &ldquo;{search}&rdquo;
              </p>
            ) : (
              <div className="grid grid-cols-8 gap-1" role="row">
                {filtered.map((entry, i) => {
                  const isFocused = i === focusIndex;
                  return (
                    <button
                      key={entry.emoji}
                      type="button"
                      data-index={i}
                      role="gridcell"
                      onClick={() => handleEmojiClick(entry.emoji, entry.name)}
                      disabled={isFull}
                      tabIndex={-1}
                      aria-label={entry.name}
                      className={`flex items-center justify-center rounded p-1.5 text-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        isFull
                          ? "cursor-not-allowed opacity-30"
                          : isFocused
                          ? "bg-accent/20 ring-2 ring-accent"
                          : "hover:bg-accent/10"
                      }`}
                      title={entry.name}
                    >
                      {entry.emoji}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-border px-3 py-1.5">
            <p className="text-xs text-content-muted">
              {isFull
                ? "Emoji ID complete. Use Undo or Clear to change."
                : `Pick ${EMOJI_ID_LENGTH - emojiChars.length} more`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
