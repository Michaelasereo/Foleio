export {};

declare global {
  interface Window {
    /** Dojah Connect constructor from https://widget.dojah.io/widget.js */
    Connect?: new (options: Record<string, unknown>) => {
      setup: () => void;
      open: () => void;
    };
  }
}
