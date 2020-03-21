import {TypedRecord, makeTypedFactory} from 'typed-immutable-record';
import { Transaction } from '../components/transaction/state';
import {OrderedMap} from 'immutable';
import { ECC } from 'iguana-lib';
import { InspectState, InspectStateFactory } from '../components/inspect-box/state';

export type MainPanel = 'settings' | 'transaction'

interface IRootState {
  lastUid: number,

  selectedMainPanel: MainPanel,
  selectedTransactionUid: number | undefined,
  selectedInputIdx: number | undefined,

  isWasmReady: boolean,
  ecc: ECC | undefined,
  transactions: OrderedMap<number, Transaction>,

  inspectState: InspectState,
}
export interface RootState extends TypedRecord<RootState>, IRootState {} 
export const RootStateFactory = makeTypedFactory<IRootState, RootState>({
  lastUid: 100,

  selectedMainPanel: 'settings',
  selectedTransactionUid: undefined,
  selectedInputIdx: undefined,
  isWasmReady: false,
  ecc: undefined,
  transactions: OrderedMap(),
  inspectState: InspectStateFactory(),
});
