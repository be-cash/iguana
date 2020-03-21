import { MenuAction } from "../components/side-menu/actions";
import { TransactionAction } from "../components/transaction/actions";
import { InspectAction } from "../components/inspect-box/actions";

export const GEN_UID = 'GEN_UID';
export interface GenUidAction {
  type: typeof GEN_UID,
}

export const INIT = 'INIT';
export interface InitAction {
  type: typeof INIT,
}

export type RootAction = GenUidAction
                       | InitAction
                       | MenuAction
                       | TransactionAction
                       | InspectAction;

export function makeAction(action: RootAction): RootAction { return action }
