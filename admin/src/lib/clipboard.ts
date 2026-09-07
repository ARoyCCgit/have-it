/**
 * Cross-platform, cross-browser clipboard copy function for Admin panel.
 * Supports:
 * - Secure Contexts (HTTPS & localhost) via modern navigator.clipboard.writeText
 * - Insecure Contexts (HTTP on LAN / mobile testing) via document.execCommand('copy') fallback
 * - Mobile devices (iOS Safari, Android Chrome, Samsung Internet)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard API if available in secure context
  if (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, falling back to execCommand fallback:', err);
    }
  }

  // 2. Fallback using invisible textarea and document.execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;

      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      textArea.style.zIndex = '-1';
      textArea.style.fontSize = '16px';

      document.body.appendChild(textArea);

      textArea.focus({ preventScroll: true });
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        return true;
      }
    } catch (fallbackErr) {
      console.warn('document.execCommand with textarea failed, trying span selection:', fallbackErr);
    }

    // 3. Fallback using span range selection
    try {
      const span = document.createElement('span');
      span.textContent = text;
      span.style.whiteSpace = 'pre';
      span.style.position = 'fixed';
      span.style.top = '0';
      span.style.left = '0';
      span.style.opacity = '0';
      span.style.pointerEvents = 'none';

      document.body.appendChild(span);

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNode(span);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      const successful = document.execCommand('copy');

      if (selection) {
        selection.removeAllRanges();
      }
      document.body.removeChild(span);

      if (successful) {
        return true;
      }
    } catch (spanErr) {
      console.error('Span selection copy fallback failed:', spanErr);
    }
  }

  return false;
}
