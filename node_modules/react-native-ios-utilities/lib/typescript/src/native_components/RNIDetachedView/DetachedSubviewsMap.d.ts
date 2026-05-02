import type { OnDidSetViewIDEventPayload } from "../../types/SharedViewEvents";
export type DetachedSubviewEntry = {
    didDetachFromOriginalParent: boolean;
};
export type DetachedSubviewsMap = Record<OnDidSetViewIDEventPayload['viewID'], DetachedSubviewEntry>;
export declare const DEFAULT_DETACHED_SUBVIEW_ENTRY: DetachedSubviewEntry;
//# sourceMappingURL=DetachedSubviewsMap.d.ts.map