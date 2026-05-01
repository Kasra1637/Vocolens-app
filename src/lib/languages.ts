/**
 * Shared language constants for Deepgram Nova-2 supported languages.
 * Used by both onboarding and in-app language picker.
 */

export const LANGUAGES: {
  code: string;
  name: string;
  native: string;
  flag: string;
}[] = [
  { code: "en", name: "English", native: "English", flag: "🇺🇸" },
  {
    code: "en-AU",
    name: "English (Australia)",
    native: "English (Australia)",
    flag: "🇦🇺",
  },
  { code: "en-GB", name: "English (UK)", native: "English (UK)", flag: "🇬🇧" },
  {
    code: "en-IN",
    name: "English (India)",
    native: "English (India)",
    flag: "🇮🇳",
  },
  {
    code: "en-NZ",
    name: "English (New Zealand)",
    native: "English (NZ)",
    flag: "🇳🇿",
  },
  { code: "zh-CN", name: "Chinese (Simplified)", native: "普通话", flag: "🇨🇳" },
  {
    code: "zh-TW",
    name: "Chinese (Traditional)",
    native: "繁體中文",
    flag: "🇹🇼",
  },
  { code: "da", name: "Danish", native: "Dansk", flag: "🇩🇰" },
  { code: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "nl-BE", name: "Flemish", native: "Vlaams", flag: "🇧🇪" },
  { code: "fi", name: "Finnish", native: "Suomi", flag: "🇫🇮" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "el", name: "Greek", native: "Ελληνικά", flag: "🇬🇷" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "it", name: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "lv", name: "Latvian", native: "Latviešu", flag: "🇱🇻" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių", flag: "🇱🇹" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "no", name: "Norwegian", native: "Norsk", flag: "🇳🇴" },
  { code: "pl", name: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "pt", name: "Portuguese", native: "Português", flag: "🇵🇹" },
  {
    code: "pt-BR",
    name: "Portuguese (Brazil)",
    native: "Português (Brasil)",
    flag: "🇧🇷",
  },
  { code: "ro", name: "Romanian", native: "Română", flag: "🇷🇴" },
  { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "sk", name: "Slovak", native: "Slovenčina", flag: "🇸🇰" },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  {
    code: "es-419",
    name: "Spanish (Latin America)",
    native: "Español (Latinoamérica)",
    flag: "🌎",
  },
  { code: "sv", name: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "ta", name: "Tamil", native: "தமிழ்", flag: "🇱🇰" },
  { code: "th", name: "Thai", native: "ภาษาไทย", flag: "🇹🇭" },
  { code: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "uk", name: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
];

export const DEFAULT_LANGUAGE = "en";

export function getLanguageByCode(code: string) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
