// Lets a full-screen battle send the player to another screen of the app: the web navigation is
// hidden while a battle is up, and the battle's menu offers the way out.

export type AppView = 'creator' | 'campaign' | 'mission' | 'combat' | 'arena';

let go: ((v: AppView) => void) | null = null;

/** The app registers how it changes screen. */
export function setAppNavigate(fn: ((v: AppView) => void) | null): void {
  go = fn;
}

export function appNavigate(v: AppView): void {
  go?.(v);
}
