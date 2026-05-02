"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CardRowColorPicker = void 0;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _Colors = require("../misc/Colors");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const PALLETES = [_Colors.Colors.PINK, _Colors.Colors.RED, _Colors.Colors.ORANGE, _Colors.Colors.AMBER, _Colors.Colors.YELLOW, _Colors.Colors.LIGHT_GREEN, _Colors.Colors.GREEN, _Colors.Colors.BLUE, _Colors.Colors.INDIGO, _Colors.Colors.VIOLET, _Colors.Colors.PURPLE, _Colors.Colors.BLUE_GREY, _Colors.Colors.GREY];
const BASE_COLORS = PALLETES.reduce((acc, curr) => {
  if ('A700' in curr) acc[0].push(curr.A700);
  acc[1].push(curr['900']);
  acc[2].push(curr['600']);
  acc[3].push(curr['300']);
  return acc;
}, [[], [], [], []]);
const DEFAULT_COLORS = ['black', 'white', ...BASE_COLORS.flat()];
class CardRowColorPicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedItem: undefined
    };
  }
  _listRenderItem = ({
    item
  }) => {
    const props = this.props;
    const state = this.state;
    const isSelected = item === state.selectedItem;
    return /*#__PURE__*/React.createElement(_reactNative.TouchableOpacity, {
      style: [styles.listItem, isSelected && styles.listItemSelected, {
        backgroundColor: item
      }],
      onPress: () => {
        var _props$onSelectItem;
        // clear if already selected
        const selectedItem = isSelected ? undefined : item;
        this.setState({
          selectedItem
        });
        (_props$onSelectItem = props.onSelectItem) === null || _props$onSelectItem === void 0 || _props$onSelectItem.call(props, selectedItem);
      }
    });
  };
  render() {
    const state = this.state;
    const hasSelection = state.selectedItem != null;
    return /*#__PURE__*/React.createElement(_reactNative.View, {
      style: styles.rootContainer
    }, /*#__PURE__*/React.createElement(_reactNative.View, {
      style: styles.selectedColorContainer
    }, /*#__PURE__*/React.createElement(_reactNative.Text, {
      style: styles.selectedColorLabel
    }, 'Selected Color:'), hasSelection ? /*#__PURE__*/React.createElement(_reactNative.View, {
      style: [styles.listItem, styles.selectedColorValueContainer, {
        backgroundColor: state.selectedItem
      }]
    }) : /*#__PURE__*/React.createElement(_reactNative.Text, {
      style: styles.selectedColorValue
    }, 'N/A')), /*#__PURE__*/React.createElement(_reactNative.FlatList, {
      style: [styles.list],
      data: DEFAULT_COLORS,
      renderItem: this._listRenderItem,
      scrollIndicatorInsets: {
        left: 10,
        right: 10
      },
      keyExtractor: item => item,
      horizontal: true
    }));
  }
}
exports.CardRowColorPicker = CardRowColorPicker;
;
const styles = _reactNative.StyleSheet.create({
  rootContainer: {
    marginTop: 12
  },
  selectedColorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 25
  },
  selectedColorLabel: {
    fontSize: 12
  },
  selectedColorValue: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.3)'
  },
  list: {
    marginTop: 10,
    backgroundColor: _Colors.Colors.INDIGO[100],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  listItem: {
    height: 25,
    minWidth: 25,
    backgroundColor: 'white',
    borderRadius: 25 / 2,
    marginRight: 10
  },
  listItemSelected: {
    width: 50
  },
  selectedColorValueContainer: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.75)'
  }
});
//# sourceMappingURL=CardRowColorPicker.js.map