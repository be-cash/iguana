import { Tx, ScriptError, Interpreter, ECC, setPanicHook } from "iguana-lib";
import { RootState } from "../../state/rootstate";
import { RootAction } from "../../state/rootaction";
import { UPDATE_TRANSACTION, ADD_WEB_SOCKET_TRANSACTION, INIT_ECC, WASM_READY } from "./actions";
import { List } from 'immutable';
import { SELECT_TRANSACTION } from "../side-menu/actions";
import {
  Transaction, TransactionSource, TransactionInput, TraceItem, TraceItemFactory, TransactionInputFactory,
  TransactionFactory, WebSocketTransactionSourceFactory,
} from "./state";
import { prepareTrace } from "./data";

function deleteTx(tx: Transaction) {
  tx.tx?.free();
  for (const input of tx.inputs) {
    input.txInput.free();
    input.error?.free();
    input.trace.map(item => {
      item.op?.free();
      item.stack.free();
      item.altStack.free();
    });
  }
}

function evalTransaction(ecc: ECC, tx: Tx, name: string | undefined, source: TransactionSource): Transaction {
  const inputs: TransactionInput[] = [];
  for (const input of tx.inputs()) {
    const interpreter = new Interpreter(ecc, input);
    const trace: TraceItem[] = [];
    let error: ScriptError | undefined = undefined;
    trace.push(TraceItemFactory({
      op: undefined,
      stack: interpreter.stack(),
      altStack: interpreter.altStack(),
      execStack: interpreter.execStack(),
      isExecuted: true,
    }));
    while (error === undefined && !interpreter.isFinished()) {
      const op = interpreter.nextOp();
      const execStack = interpreter.execStack();
      error = interpreter.next();
      trace.push(TraceItemFactory({
        op,
        stack: interpreter.stack(),
        altStack: interpreter.altStack(),
        execStack,
        isExecuted: execStack.reduce((a, b) => a && b, true),
      }));
    }
    const traceList = List(trace);
    const {columns, data, stackItemColumns} = prepareTrace(traceList);
    const transactionInput = TransactionInputFactory({
      txInput: input,
      trace: traceList,
      error,
      columns,
      stackItemColumns,
      data,
    });
    inputs.push(transactionInput);
  }
  return TransactionFactory({tx, inputs: List(inputs), name, source})
}

export function reduce(state: RootState, action: RootAction): RootState {
  switch (action.type) {
    case INIT_ECC:
      return state.set('ecc', action.ecc);
    case WASM_READY:
      setPanicHook();
      return state.set('isWasmReady', true);
    case UPDATE_TRANSACTION:
      if (state.ecc === undefined) {
        console.error('ECC not initialized')
        return state;
      }
      const oldTransaction = state.transactions.get(action.uid);
      if (oldTransaction === undefined) {
        console.error('Tried updating non-existent transaction:', action.uid);
        return state;
      }
      deleteTx(oldTransaction);
      return state.setIn(
        ['transactions', action.uid],
        evalTransaction(state.ecc, action.tx, oldTransaction.name, oldTransaction.source),
      );
    case ADD_WEB_SOCKET_TRANSACTION:
      return state.setIn(
        ['transactions', action.uid],
        TransactionFactory({
          tx: undefined,
          inputs: List(),
          name: action.name,
          source: WebSocketTransactionSourceFactory({
            type: 'websocket',
            url: action.url,
          })
        })
      );
    case SELECT_TRANSACTION:
      return state.set('selectedTransactionUid', action.selectedTransactionUid)
                  .set('selectedInputIdx', action.selectedInputIdx)
    default:
      return state;
  }
}