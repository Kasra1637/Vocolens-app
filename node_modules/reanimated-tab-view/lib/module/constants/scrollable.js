import { Platform } from 'react-native';
export const DECELERATION_RATE_FOR_SCROLLVIEW = Platform.select({
  ios: 0.9998,
  android: 0.9985,
  default: 1
});
export let GestureSource = /*#__PURE__*/function (GestureSource) {
  GestureSource["PAN"] = "PAN";
  GestureSource["SCROLL"] = "SCROLL";
  return GestureSource;
}({});
export let ScrollableType = /*#__PURE__*/function (ScrollableType) {
  ScrollableType["SCROLL_VIEW"] = "SCROLL_VIEW";
  ScrollableType["FLAT_LIST"] = "FLAT_LIST";
  ScrollableType["VIRTUALIZED_LIST"] = "VIRTUALIZED_LIST";
  ScrollableType["SECTION_LIST"] = "SECTION_LIST";
  ScrollableType["FLASH_LIST"] = "FLASH_LIST";
  return ScrollableType;
}({});
export const SHOULD_RENDER_ABSOLUTE_HEADER = Platform.OS === 'android';
//# sourceMappingURL=scrollable.js.map