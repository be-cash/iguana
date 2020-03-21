import { RootState } from "../../state/rootstate";
import { RootAction } from "../../state/rootaction";
import { SELECT_COMPARED_BYTE_ARRAY, EXPAND_INSPECT_BOX, COMPARE_BYTE_ARRAYS } from "./actions";

export function reduce(state: RootState, action: RootAction): RootState {
  switch (action.type) {
    case SELECT_COMPARED_BYTE_ARRAY:
      return state.setIn(['inspectState', `compareArray${action.side}`], action.byteArray);
    case COMPARE_BYTE_ARRAYS:
      return state.setIn(['inspectState', 'compareArrayA'], action.byteArrayA)
                  .setIn(['inspectState', 'compareArrayB'], action.byteArrayB);
    case EXPAND_INSPECT_BOX:
      return state.setIn(['inspectState', 'isExpanded'], action.isExpanded);
    default:
      return state;
  }
}
