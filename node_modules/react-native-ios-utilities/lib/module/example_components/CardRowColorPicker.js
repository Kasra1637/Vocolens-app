import * as React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Colors } from '../misc/Colors';
const PALLETES = [Colors.PINK, Colors.RED, Colors.ORANGE, Colors.AMBER, Colors.YELLOW, Colors.LIGHT_GREEN, Colors.GREEN, Colors.BLUE, Colors.INDIGO, Colors.VIOLET, Colors.PURPLE, Colors.BLUE_GREY, Colors.GREY];
const BASE_COLORS = PALLETES.reduce((acc, curr) => {
  if ('A700' in curr) acc[0].push(curr.A700);
  acc[1].push(curr['900']);
  acc[2].push(curr['600']);
  acc[3].push(curr['300']);
  return acc;
}, [[], [], [], []]);
const DEFAULT_COLORS = ['black', 'white', ...BASE_COLORS.flat()];
export class CardRowColorPicker extends React.Component {
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
    return /*#__PURE__*/React.createElement(TouchableOpacity, {
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
    return /*#__PURE__*/React.createElement(View, {
      style: styles.rootContainer
    }, /*#__PURE__*/React.createElement(View, {
      style: styles.selectedColorContainer
    }, /*#__PURE__*/React.createElement(Text, {
      style: styles.selectedColorLabel
    }, 'Selected Color:'), hasSelection ? /*#__PURE__*/React.createElement(View, {
      style: [styles.listItem, styles.selectedColorValueContainer, {
        backgroundColor: state.selectedItem
      }]
    }) : /*#__PURE__*/React.createElement(Text, {
      style: styles.selectedColorValue
    }, 'N/A')), /*#__PURE__*/React.createElement(FlatList, {
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
;
const styles = StyleSheet.create({
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
    backgroundColor: Colors.INDIGO[100],
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