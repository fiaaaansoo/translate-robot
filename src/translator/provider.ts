/** One prior attempt that overflowed its component's box, for feedback to the provider. */
export interface TranslateAttempt {
  text: string;
  measuredWidth: number;
  clientWidth: number;
}

export interface TranslateRequest {
  key: string;
  sourceText: string;
  targetLocale: string;
  /** The component box's own width, measured once before the first attempt (same for every attempt - it depends on CSS, not on candidate text length). */
  targetWidthPx: number;
  /** Prior overflowing attempts for this key, oldest first. Empty on the first attempt. */
  previousAttempts: TranslateAttempt[];
}

export interface TranslationProvider {
  translate(request: TranslateRequest): Promise<string>;
}
