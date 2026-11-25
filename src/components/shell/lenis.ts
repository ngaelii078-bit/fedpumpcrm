import type Lenis from "lenis";

/* one page level instance, so overlays can pause it */
let inst: Lenis | null = null;
export const setLenis = (l: Lenis | null) => {
  inst = l;
};
export const lenisStop = (stop: boolean) => {
  if (stop) inst?.stop();
  else inst?.start();
};
export const lenisTop = () => {
  if (inst) inst.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
};
