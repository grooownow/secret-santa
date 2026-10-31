export {
  canExit,
  canGuess,
  canMarkGift,
  defaultSettings,
  getPhase,
  registrationOpen,
  wallOpen,
} from "./phase";
export type { GameSettings, Phase } from "./phase";
export { getSettings } from "./settings";
export { redirectIfClosed } from "./ensure-open";
export { SiteFooter } from "./site-footer";
export { SiteHeader } from "./site-header";
export { LanguageSwitcher } from "./language-switcher";
export { LanguageForm } from "./language-form";
export { setLocaleAction } from "./set-locale-action";
export { TranslateLink } from "@/components/translate-link";
export { translateUrl } from "@/lib/translate-url";
