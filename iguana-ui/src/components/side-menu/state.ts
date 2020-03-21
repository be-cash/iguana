import { RootState, MainPanel } from "../../state/rootstate";
import { RootAction } from "../../state/rootaction";
import { SELECT_SETTINGS_PANEL, SELECT_TRANSACTION } from "./actions";

const panel = (p: MainPanel) => p;

export function reduce(state: RootState, action: RootAction): RootState {
  switch (action.type) {
    case SELECT_SETTINGS_PANEL:
      return state.set('selectedMainPanel', panel('settings'))
                  .set('selectedTransactionUid', undefined)
                  .set('selectedInputIdx', undefined);
    case SELECT_TRANSACTION:
      return state.set('selectedMainPanel', panel('transaction'))
                  .set('selectedTransactionUid', action.selectedTransactionUid)
                  .set('selectedInputIdx', action.selectedInputIdx);
    default:
      return state;
  }
}
