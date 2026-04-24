/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView } from 'react-native';

export type TextProps = DefaultText['props'];
export type ViewProps = DefaultView['props'];

export function Text(props: TextProps) {
  const { className, ...otherProps } = props;
  const combinedClassName = className 
    ? `text-black dark:text-white ${className}`.trim()
    : 'text-black dark:text-white';
  return (
    <DefaultText
      className={combinedClassName}
      {...otherProps}
    />
  );
}

export function View(props: ViewProps) {
  const { className, ...otherProps } = props;
  const combinedClassName = className 
    ? `bg-white dark:bg-black ${className}`.trim()
    : 'bg-white dark:bg-black';
  return (
    <DefaultView
      className={combinedClassName}
      {...otherProps}
    />
  );
}
