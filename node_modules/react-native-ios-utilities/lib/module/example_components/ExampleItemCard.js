import * as React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Colors } from '../misc/Colors';
export function ExampleItemCard(props) {
  var _props$description;
  const descriptionFiltered = (_props$description = props.description) === null || _props$description === void 0 ? void 0 : _props$description.filter(item => item != null);
  const descriptionMain = descriptionFiltered === null || descriptionFiltered === void 0 ? void 0 : descriptionFiltered[0];
  const descriptionSub = descriptionFiltered === null || descriptionFiltered === void 0 ? void 0 : descriptionFiltered.slice(1);
  const colors = props.colorPalette ?? Colors.BLUE;
  const bodyContainerStyle = {
    backgroundColor: colors[100]
  };
  const bodyDescriptionLabelTextStyle = {
    color: colors[1100]
  };
  const headerContainerStyle = {
    backgroundColor: colors.A700
  };
  const shouldShowHeaderTitleIndex = props.index != null;
  const isTitleOnly = props.subtitle == null;
  const headerTitleTextStyle = {
    ...(isTitleOnly && {
      fontSize: 16
    })
  };
  const titleAndSubtitleElement = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Text, {
    style: [styles.headerTitleText, headerTitleTextStyle]
  }, props.title ?? 'N/A'), props.subtitle && /*#__PURE__*/React.createElement(Text, {
    style: styles.headerSubtitleText
  }, props.subtitle));
  return /*#__PURE__*/React.createElement(View, {
    style: [styles.rootContainer, props.style]
  }, /*#__PURE__*/React.createElement(View, {
    style: [styles.headerContainer, headerContainerStyle]
  }, shouldShowHeaderTitleIndex ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Text, {
    style: styles.headerTitleIndexText
  }, `${props.index}. `), /*#__PURE__*/React.createElement(View, {
    style: styles.headerTitleContainer
  }, titleAndSubtitleElement)) : titleAndSubtitleElement), /*#__PURE__*/React.createElement(View, {
    style: [styles.bodyContainer, bodyContainerStyle]
  }, descriptionMain && /*#__PURE__*/React.createElement(Text, {
    style: styles.bodyDescriptionText
  }, /*#__PURE__*/React.createElement(Text, {
    style: [styles.bodyDescriptionLabelText, bodyDescriptionLabelTextStyle]
  }, 'Description: '), descriptionMain), descriptionSub === null || descriptionSub === void 0 ? void 0 : descriptionSub.map((description, index) => /*#__PURE__*/React.createElement(Text, {
    key: `desc-${index}`,
    style: [styles.bodyDescriptionText, styles.bodyDescriptionSubText]
  }, description)), React.Children.count(props.children) > 0 && /*#__PURE__*/React.createElement(View, {
    style: props.extraContentContainerStyle
  }, props.children)));
}
;
const styles = StyleSheet.create({
  rootContainer: {
    borderRadius: 10,
    overflow: 'hidden'
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8
  },
  headerTitleContainer: {
    marginLeft: 5
  },
  headerTitleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)'
  },
  headerTitleIndexText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)'
  },
  headerSubtitleText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400'
  },
  bodyContainer: {
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 10
  },
  bodyDescriptionText: {
    fontWeight: '300',
    color: 'rgba(0,0,0,0.75)'
  },
  bodyDescriptionLabelText: {
    fontWeight: 'bold'
  },
  bodyDescriptionSubText: {
    marginTop: 10
  }
});
//# sourceMappingURL=ExampleItemCard.js.map