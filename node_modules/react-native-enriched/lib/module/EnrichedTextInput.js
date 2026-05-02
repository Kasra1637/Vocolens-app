"use strict";

import { useImperativeHandle, useMemo, useRef } from 'react';
import EnrichedTextInputNativeComponent, { Commands } from './EnrichedTextInputNativeComponent';
import { normalizeHtmlStyle } from "./normalizeHtmlStyle.js";
import { jsx as _jsx } from "react/jsx-runtime";
const nullthrows = value => {
  if (value == null) {
    throw new Error('Unexpected null or undefined value');
  }
  return value;
};
const warnAboutMissconfiguredMentions = indicator => {
  console.warn(`Looks like you are trying to set a "${indicator}" but it's not in the mentionIndicators prop`);
};
export const EnrichedTextInput = ({
  ref,
  autoFocus,
  editable = true,
  mentionIndicators = ['@'],
  defaultValue,
  placeholder,
  placeholderTextColor,
  cursorColor,
  selectionColor,
  style,
  autoCapitalize = 'sentences',
  htmlStyle = {},
  onFocus,
  onBlur,
  onChangeText,
  onChangeHtml,
  onChangeState,
  onLinkDetected,
  onMentionDetected,
  onStartMention,
  onChangeMention,
  onEndMention,
  onChangeSelection,
  androidExperimentalSynchronousEvents = false,
  scrollEnabled = true,
  ...rest
}) => {
  const nativeRef = useRef(null);
  const normalizedHtmlStyle = useMemo(() => normalizeHtmlStyle(htmlStyle, mentionIndicators), [htmlStyle, mentionIndicators]);
  useImperativeHandle(ref, () => ({
    measureInWindow: callback => {
      nullthrows(nativeRef.current).measureInWindow(callback);
    },
    measure: callback => {
      nullthrows(nativeRef.current).measure(callback);
    },
    measureLayout: (relativeToNativeComponentRef, onSuccess, onFail) => {
      nullthrows(nativeRef.current).measureLayout(relativeToNativeComponentRef, onSuccess, onFail);
    },
    setNativeProps: nativeProps => {
      nullthrows(nativeRef.current).setNativeProps(nativeProps);
    },
    focus: () => {
      Commands.focus(nullthrows(nativeRef.current));
    },
    blur: () => {
      Commands.blur(nullthrows(nativeRef.current));
    },
    setValue: value => {
      Commands.setValue(nullthrows(nativeRef.current), value);
    },
    toggleBold: () => {
      Commands.toggleBold(nullthrows(nativeRef.current));
    },
    toggleItalic: () => {
      Commands.toggleItalic(nullthrows(nativeRef.current));
    },
    toggleUnderline: () => {
      Commands.toggleUnderline(nullthrows(nativeRef.current));
    },
    toggleStrikeThrough: () => {
      Commands.toggleStrikeThrough(nullthrows(nativeRef.current));
    },
    toggleInlineCode: () => {
      Commands.toggleInlineCode(nullthrows(nativeRef.current));
    },
    toggleH1: () => {
      Commands.toggleH1(nullthrows(nativeRef.current));
    },
    toggleH2: () => {
      Commands.toggleH2(nullthrows(nativeRef.current));
    },
    toggleH3: () => {
      Commands.toggleH3(nullthrows(nativeRef.current));
    },
    toggleCodeBlock: () => {
      Commands.toggleCodeBlock(nullthrows(nativeRef.current));
    },
    toggleBlockQuote: () => {
      Commands.toggleBlockQuote(nullthrows(nativeRef.current));
    },
    toggleOrderedList: () => {
      Commands.toggleOrderedList(nullthrows(nativeRef.current));
    },
    toggleUnorderedList: () => {
      Commands.toggleUnorderedList(nullthrows(nativeRef.current));
    },
    setLink: (start, end, text, url) => {
      Commands.addLink(nullthrows(nativeRef.current), start, end, text, url);
    },
    setImage: uri => {
      Commands.addImage(nullthrows(nativeRef.current), uri);
    },
    setMention: (indicator, text, attributes) => {
      // Codegen does not support objects as Commands parameters, so we stringify attributes
      const parsedAttributes = JSON.stringify(attributes ?? {});
      Commands.addMention(nullthrows(nativeRef.current), indicator, text, parsedAttributes);
    },
    startMention: indicator => {
      if (!mentionIndicators?.includes(indicator)) {
        warnAboutMissconfiguredMentions(indicator);
      }
      Commands.startMention(nullthrows(nativeRef.current), indicator);
    }
  }));
  const handleMentionEvent = e => {
    const mentionText = e.nativeEvent.text;
    const mentionIndicator = e.nativeEvent.indicator;
    if (typeof mentionText === 'string') {
      if (mentionText === '') {
        onStartMention?.(mentionIndicator);
      } else {
        onChangeMention?.({
          indicator: mentionIndicator,
          text: mentionText
        });
      }
    } else if (mentionText === null) {
      onEndMention?.(mentionIndicator);
    }
  };
  const handleLinkDetected = e => {
    const {
      text,
      url,
      start,
      end
    } = e.nativeEvent;
    onLinkDetected?.({
      text,
      url,
      start,
      end
    });
  };
  const handleMentionDetected = e => {
    const {
      text,
      indicator,
      payload
    } = e.nativeEvent;
    const attributes = JSON.parse(payload);
    onMentionDetected?.({
      text,
      indicator,
      attributes
    });
  };
  return /*#__PURE__*/_jsx(EnrichedTextInputNativeComponent, {
    ref: nativeRef,
    mentionIndicators: mentionIndicators,
    editable: editable,
    autoFocus: autoFocus,
    defaultValue: defaultValue,
    placeholder: placeholder,
    placeholderTextColor: placeholderTextColor,
    cursorColor: cursorColor,
    selectionColor: selectionColor,
    style: style,
    autoCapitalize: autoCapitalize,
    htmlStyle: normalizedHtmlStyle,
    onInputFocus: onFocus,
    onInputBlur: onBlur,
    onChangeText: onChangeText,
    onChangeHtml: onChangeHtml,
    isOnChangeHtmlSet: onChangeHtml !== undefined,
    onChangeState: onChangeState,
    onLinkDetected: handleLinkDetected,
    onMentionDetected: handleMentionDetected,
    onMention: handleMentionEvent,
    onChangeSelection: onChangeSelection,
    androidExperimentalSynchronousEvents: androidExperimentalSynchronousEvents,
    scrollEnabled: scrollEnabled,
    ...rest
  });
};
//# sourceMappingURL=EnrichedTextInput.js.map