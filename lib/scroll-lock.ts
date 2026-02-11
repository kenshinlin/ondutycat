let scrollPosition = 0;
let isLocked = false;

export function lockScroll() {
  if (isLocked) return;

  scrollPosition = window.scrollY;
  const body = document.body;

  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${scrollPosition}px`;
  body.style.width = '100%';

  isLocked = true;
}

export function unlockScroll() {
  if (!isLocked) return;

  const body = document.body;

  body.style.overflow = '';
  body.style.position = '';
  body.style.top = '';
  body.style.width = '';

  window.scrollTo(0, scrollPosition);

  isLocked = false;
}

export function useScrollLock(isLocked: boolean) {
  if (typeof window === 'undefined') return;

  if (isLocked) {
    lockScroll();
  } else {
    unlockScroll();
  }
}
