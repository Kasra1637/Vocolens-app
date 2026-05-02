import type { BubblingEventHandler } from "react-native/Libraries/Types/CodegenTypes";
import type { UIViewAnimatingPosition, UIViewPropertyAnimator } from "./NativeTypes";
export type OnPropertyAnimatorDidStartEventPayload = Readonly<{
    objectMetadata: UIViewPropertyAnimator;
    didCancelPreviousAnimation?: boolean;
}>;
export type OnPropertyAnimatorDidStartEvent = BubblingEventHandler<OnPropertyAnimatorDidStartEventPayload>;
export type OnPropertyAnimatorDidCompleteEventPayload = Readonly<{
    objectMetadata: UIViewPropertyAnimator;
    animationPosition: UIViewAnimatingPosition;
    didCancel?: boolean;
}>;
export type OnPropertyAnimatorDidCompleteEvent = BubblingEventHandler<OnPropertyAnimatorDidCompleteEventPayload>;
//# sourceMappingURL=SharedAnimationEvents.d.ts.map