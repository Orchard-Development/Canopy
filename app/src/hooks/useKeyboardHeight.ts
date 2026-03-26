import { useEffect } from "react";

/**
 * Sets `--kb-height` CSS variable on `document.documentElement` to the
 * current iOS virtual keyboard height. Fixed-bottom elements can use
 * `bottom: calc(Xpx + var(--kb-height, 0px))` to stay above the keyboard.
 *
 * Intentionally avoids React state to prevent re-renders that would
 * blur the focused input and dismiss the keyboard on iOS Safari.
 */
export function useKeyboardHeight(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!isIOS) return;

    function update() {
      if (!vv) return;
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height));
      document.documentElement.style.setProperty("--kb-height", `${kb}px`);
    }

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.documentElement.style.setProperty("--kb-height", "0px");
    };
  }, []);
}
