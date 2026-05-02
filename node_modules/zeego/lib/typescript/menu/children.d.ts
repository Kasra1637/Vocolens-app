/**
 * Credit to geist-ui/react for this file, it's copied from there.
 */
import React, { ReactNode, ReactChild } from 'react';
type ReactChildArray = ReturnType<typeof React.Children.toArray>;
export declare function flattenChildrenKeyless(children: React.ReactNode): ReactChildArray;
export declare function flattenChildren(children: ReactNode, depth?: number, keys?: (string | number)[]): ReactChild[];
export declare const pickChildren: <Props = any>(_children: React.ReactNode | undefined, targetChild: React.ElementType) => {
    targetChildren: React.ReactElement<Props, string | React.JSXElementConstructor<any>>[] | undefined;
    withoutTargetChildren: React.ReactChild[];
};
export declare const isInstanceOfComponent: <Props>(element: React.ReactElement | React.ReactText | undefined, targetElement: React.ComponentType<Props> | React.ElementType<Props>) => element is NonNullable<React.ReactElement<Props>>;
export {};
