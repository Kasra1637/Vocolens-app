"use strict";

import { processColor } from 'react-native';
const defaultStyle = {
  h1: {
    fontSize: 32,
    bold: false
  },
  h2: {
    fontSize: 24,
    bold: false
  },
  h3: {
    fontSize: 20,
    bold: false
  },
  blockquote: {
    borderColor: 'darkgray',
    borderWidth: 4,
    gapWidth: 16,
    color: undefined
  },
  codeblock: {
    color: 'black',
    borderRadius: 8,
    backgroundColor: 'darkgray'
  },
  code: {
    color: 'red',
    backgroundColor: 'darkgray'
  },
  a: {
    color: 'blue',
    textDecorationLine: 'underline'
  },
  mention: {
    color: 'blue',
    backgroundColor: 'yellow',
    textDecorationLine: 'underline'
  },
  img: {
    width: 80,
    height: 80
  },
  ol: {
    gapWidth: 16,
    marginLeft: 16,
    markerFontWeight: undefined,
    markerColor: undefined
  },
  ul: {
    bulletColor: 'black',
    bulletSize: 8,
    marginLeft: 16,
    gapWidth: 16
  }
};
const isMentionStyleRecord = mentionStyle => {
  if (mentionStyle && typeof mentionStyle === 'object' && !Array.isArray(mentionStyle)) {
    const keys = Object.keys(mentionStyle);
    return keys.length > 0 && keys.every(key => typeof mentionStyle[key] === 'object' && mentionStyle[key] !== null);
  }
  return false;
};
const convertToHtmlStyleInternal = (style, mentionIndicators) => {
  const mentionStyles = {};
  mentionIndicators.forEach(indicator => {
    mentionStyles[indicator] = {
      ...defaultStyle.mention,
      ...(isMentionStyleRecord(style.mention) ? style.mention[indicator] ?? style.mention.default ?? {} : style.mention)
    };
  });
  let markerFontWeight;
  if (style.ol?.markerFontWeight) {
    if (typeof style.ol?.markerFontWeight === 'number') {
      markerFontWeight = String(style.ol?.markerFontWeight);
    } else if (typeof style.ol?.markerFontWeight === 'string') {
      markerFontWeight = style.ol?.markerFontWeight;
    }
  }
  const olStyles = {
    ...style.ol,
    markerFontWeight: markerFontWeight
  };
  return {
    ...style,
    mention: mentionStyles,
    ol: olStyles
  };
};
const assignDefaultValues = style => {
  const merged = {
    ...defaultStyle
  };
  for (const key in style) {
    if (key === 'mention') {
      merged[key] = {
        ...style.mention
      };
      continue;
    }
    merged[key] = {
      ...defaultStyle[key],
      ...style[key]
    };
  }
  return merged;
};
const parseStyle = (name, value) => {
  if (name !== 'color' && !name.endsWith('Color')) {
    return value;
  }
  return processColor(value);
};
const parseColors = style => {
  const finalStyle = {};
  for (const [tagName, tagStyle] of Object.entries(style)) {
    const tagStyles = {};
    if (tagName === 'mention') {
      for (const [indicator, mentionStyle] of Object.entries(tagStyle)) {
        tagStyles[indicator] = {};
        for (const [styleName, styleValue] of Object.entries(mentionStyle)) {
          tagStyles[indicator][styleName] = parseStyle(styleName, styleValue);
        }
      }
      finalStyle[tagName] = tagStyles;
      continue;
    }
    for (const [styleName, styleValue] of Object.entries(tagStyle)) {
      tagStyles[styleName] = parseStyle(styleName, styleValue);
    }
    finalStyle[tagName] = tagStyles;
  }
  return finalStyle;
};
export const normalizeHtmlStyle = (style, mentionIndicators) => {
  const converted = convertToHtmlStyleInternal(style, mentionIndicators);
  const withDefaults = assignDefaultValues(converted);
  return parseColors(withDefaults);
};
//# sourceMappingURL=normalizeHtmlStyle.js.map