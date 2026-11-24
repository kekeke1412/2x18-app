import katex from 'katex';
import 'katex/dist/katex.min.css';

let domPurifyPromise: Promise<any> | null = null;

function loadDOMPurify() {
  domPurifyPromise ??= import('dompurify').then(mod => mod.default ?? mod);
  return domPurifyPromise;
}

const MATH_ALLOWED_ELEMENTS = [
  'span',
  'math',
  'semantics',
  'mrow',
  'mi',
  'mo',
  'mn',
  'msup',
  'msub',
  'msubsup',
  'mfrac',
  'msqrt',
  'mroot',
  'mtable',
  'mtr',
  'mtd',
  'mtext',
  'mspace',
  'mover',
  'munder',
  'munderover',
  'annotation',
  'svg',
  'path',
  'line',
  'g',
  'p',
  'b',
  'i',
  'strong',
  'em',
  'code',
];

const MATH_ALLOWED_ATTRIBUTES = [
  'class',
  'style',
  'xmlns',
  'display',
  'encoding',
  'viewBox',
  'd',
  'width',
  'height',
  'preserveAspectRatio',
];

/**
 * Sanitizes and inserts HTML into an element following the sanitize-untrusted-html guide:
 * Uses native Element.prototype.setHTML when available, otherwise lazy-loads DOMPurify
 * configured to match native Sanitizer behavior (ALLOW_ARIA_ATTR: false, ALLOW_DATA_ATTR: false, KEEP_CONTENT: false).
 */
export async function safeSetHTML(
  el: HTMLElement | null,
  html: string,
  customElements = MATH_ALLOWED_ELEMENTS,
  customAttributes = MATH_ALLOWED_ATTRIBUTES
) {
  if (!el) return;

  if (typeof Element !== 'undefined' && 'setHTML' in Element.prototype) {
    try {
      (el as any).setHTML(html, {
        sanitizer: { elements: customElements, attributes: customAttributes },
      });
      return;
    } catch {
      // Fall through to DOMPurify if custom sanitizer config is rejected
    }
  }

  const DOMPurify = await loadDOMPurify();
  el.innerHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...customElements, '#text'],
    ALLOWED_ATTR: customAttributes,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: false,
  });
}

export function renderLatexString(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      output: 'htmlAndMathml',
    });
  } catch {
    return latex;
  }
}

// ── Accessible Copy Button Helper (copy-button guide) ──────────────────────
const copyTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
let lastAnnouncedCopyMessage = '';

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const previousFocus = document.activeElement as HTMLElement | null;
  const field = Object.assign(document.createElement('textarea'), { value: text });
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;inset-block-start:0;opacity:0';
  document.body.append(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    previousFocus?.focus?.({ preventScroll: true });
  }
}

export function reportCopyStatus(button: HTMLElement, ok: boolean) {
  const tip = button.nextElementSibling as HTMLElement | null;
  const existingTimer = copyTimers.get(button);
  if (existingTimer) clearTimeout(existingTimer);

  button.removeAttribute('data-copied');
  button.removeAttribute('data-failed');

  let message = ok ? 'Đã sao chép' : 'Lỗi sao chép';
  if (message === lastAnnouncedCopyMessage) {
    message += '\u00A0';
  }
  lastAnnouncedCopyMessage = message;

  if (tip) tip.textContent = '';
  void button.offsetWidth;
  button.setAttribute(ok ? 'data-copied' : 'data-failed', '');

  if (tip) {
    requestAnimationFrame(() => {
      tip.textContent = message;
    });
  }

  copyTimers.set(
    button,
    setTimeout(() => {
      button.removeAttribute('data-copied');
      button.removeAttribute('data-failed');
      if (tip) tip.textContent = '';
    }, 2000)
  );
}

export async function performAccessibleCopy(button: HTMLElement, text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;
  try {
    await navigator.clipboard.writeText(trimmed);
    reportCopyStatus(button, true);
    return true;
  } catch {
    const ok = legacyCopy(trimmed);
    reportCopyStatus(button, ok);
    return ok;
  }
}
