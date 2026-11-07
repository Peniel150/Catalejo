import { navigate, useLoc } from "../store.ts";
export function usePathname() { return useLoc().path; }
export function useSearchParams() { const { search } = useLoc(); return new URLSearchParams(search); }
export function useRouter() { return { push: (h: string, o?: { scroll?: boolean }) => navigate(h, o), replace: (h: string, o?: { scroll?: boolean }) => navigate(h, o), back: () => history.back(), refresh: () => {} }; }
export function redirect(h: string): never { navigate(h); throw new Error("redirect"); }
export function notFound(): never { throw new Error("notFound"); }
