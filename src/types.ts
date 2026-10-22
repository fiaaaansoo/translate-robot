// Shared types for the extractor/translator/pr pipeline (tasks 04-06).

/** A flat i18n catalog: key -> source text. No pluralization/nesting in v1. */
export type I18nCatalog = Record<string, string>;

/** One entry of the key->component mapping file (fixtures/toy-repo/i18n-map.json format). */
export interface I18nMappingEntry {
  /** Path to the component file, relative to the mapping file's own directory. */
  component: string;
  /** CSS selector of the node whose rendered width is the constraint. */
  selector: string;
}

export type I18nMapping = Record<string, I18nMappingEntry>;

/** One i18n key the extractor resolved: enough context for the translator/measure step. */
export interface ExtractedChange {
  key: string;
  sourceText: string;
  /** Absolute path to the component file. */
  componentPath: string;
  /** CSS selector of the node to measure, copied from the mapping entry. */
  measureTarget: string;
}

/** A key the extractor could not resolve, with a human-readable reason. */
export interface ExtractionError {
  key: string;
  reason: string;
}

export interface ExtractionResult {
  changes: ExtractedChange[];
  errors: ExtractionError[];
}

/**
 * Outcome of translating one key under its component's measured width
 * constraint (task 05). `resolved: false` means every attempt up to the
 * retry bound still overflowed - `translatedText` is the last (shortest)
 * attempt, returned so task 06 can flag it rather than silently drop it.
 */
export interface TranslationResult {
  key: string;
  translatedText: string;
  measuredWidth: number;
  iterations: number;
  resolved: boolean;
}
