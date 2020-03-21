import * as tx from "../components/transaction/reducer";
import * as menu from "../components/side-menu/state";
import * as inspect from "../components/inspect-box/reducer";
import { RootState, RootStateFactory } from "./rootstate";
import { RootAction, GEN_UID } from "./rootaction";

const reducers = [
  tx.reduce,
  menu.reduce,
  inspect.reduce,
];

export function reduce(state: RootState | undefined, action: RootAction): RootState {
  if (state === undefined) {
    state = RootStateFactory();
  }
  switch (action.type) {
    case GEN_UID:
      state = state.set('lastUid', state.lastUid + 1);
      break;
  }
  return reducers.reduce((prev, fn) => fn(prev, action), state);
}
