import { TypedRecord, makeTypedFactory } from "typed-immutable-record";
import { Tx, Stack, Op, ScriptError, TxInput, ByteArray } from "iguana-lib";
import { List } from 'immutable';

interface IInspectState {
  isExpanded: boolean,
  compareArrayA: ByteArray | undefined,
  compareArrayB: ByteArray | undefined,
}
export interface InspectState extends TypedRecord<InspectState>, IInspectState {} 
export const InspectStateFactory = makeTypedFactory<IInspectState, InspectState>({
  isExpanded: false,
  compareArrayA: undefined,
  compareArrayB: undefined,
});
