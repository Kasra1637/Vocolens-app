import * as React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Colors } from '../misc/Colors';

/**
 * ```
 * ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
 *              .─────────────.   
 * │ Title     (  Pill  Title  ) │
 *              `─────────────'   
 * │ Subtitle...                 │
 *  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 
 * ```
 */
export function CardTitle(props) {
  const hasTitle = props.title != null;
  const cardPillWrapper = {
    marginLeft: hasTitle ? 10 : 0
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(View, {
    style: [styles.cardTitleContainer, {
      marginTop: props.extraMarginTop ?? 0
    }]
  }, /*#__PURE__*/React.createElement(Text, {
    style: styles.cardTitle
  }, props.title ?? ''), props.pillTitle && /*#__PURE__*/React.createElement(View, {
    style: [styles.cardPillWrapper, cardPillWrapper]
  }, /*#__PURE__*/React.createElement(View, {
    style: styles.cardPillContainer
  }, /*#__PURE__*/React.createElement(Text, {
    style: styles.cardPillTitleText,
    numberOfLines: 1
  }, props.pillTitle)))), props.subtitle && /*#__PURE__*/React.createElement(Text, {
    style: styles.cardSubtitleText
  }, props.subtitle ?? 'subtitle'));
}
;
const styles = StyleSheet.create({
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  cardPillWrapper: {
    flex: 1,
    alignItems: 'flex-start'
  },
  cardPillContainer: {
    backgroundColor: Colors.BLUE.A400,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10
  },
  cardPillTitleText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  cardSubtitleText: {
    marginTop: 7,
    fontWeight: '300',
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)'
  }
});
//# sourceMappingURL=CardTitle.js.map