// Mock for react-native-gesture-handler used in Jest tests
const React = require('react');
const { View, TouchableOpacity, ScrollView } = require('react-native');

// Swipeable mock: renders children + right actions so tests can interact with delete button
const Swipeable = ({ children, renderRightActions }) => {
  return React.createElement(
    View,
    null,
    children,
    renderRightActions ? renderRightActions() : null
  );
};

const GestureHandlerRootView = ({ children }) => children;
const PanGestureHandler = ({ children }) => children;
const TapGestureHandler = ({ children }) => children;

module.exports = {
  Swipeable,
  GestureHandlerRootView,
  PanGestureHandler,
  TapGestureHandler,
  TouchableOpacity,
  TouchableHighlight: TouchableOpacity,
  TouchableNativeFeedback: TouchableOpacity,
  ScrollView,
  FlatList: require('react-native').FlatList,
  State: {},
  Directions: {},
};
