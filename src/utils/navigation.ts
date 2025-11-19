type AppRoute = '/' | '/history' | '/settings' | '/logs';

const NAVIGATE_EVENT = 'app:navigate';

export function navigate(path: AppRoute) {
  if (window.location.pathname === path) {
    return;
  }

  window.history.pushState({}, '', path);
  const event = new CustomEvent<{ path: AppRoute }>(NAVIGATE_EVENT, {
    detail: { path },
  });
  window.dispatchEvent(event);
}

export const navigationConstants = {
  eventName: NAVIGATE_EVENT,
} as const;

