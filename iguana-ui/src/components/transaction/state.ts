import { TypedRecord, makeTypedFactory } from "typed-immutable-record";
import { Tx, Stack, Op, ScriptError, TxInput } from "iguana-lib";
import { List } from 'immutable';

interface ITransaction {
  tx: Tx | undefined,
  name: string | undefined,
  inputs: List<TransactionInput>,
  source: TransactionSource,
}
export interface Transaction extends TypedRecord<Transaction>, ITransaction {} 
export const TransactionFactory = makeTypedFactory<ITransaction, Transaction>({
  tx: undefined,
  name: undefined,
  inputs: List(),
  source: undefined as any,
});

interface ITransactionInput {
  txInput: TxInput,
  error: ScriptError | undefined,
  trace: List<TraceItem>,
  columns: any[],
  stackItemColumns: any[],
  data: any[],
}
export interface TransactionInput extends TypedRecord<TransactionInput>, ITransactionInput {} 
export const TransactionInputFactory = makeTypedFactory<ITransactionInput, TransactionInput>({
  txInput: 'INVALID' as any,
  error: undefined,
  trace: List(),
  columns: [],
  stackItemColumns: [],
  data: [],
});

interface ITraceItem {
  op: Op | undefined,
  stack: Stack,
  altStack: Stack,
  execStack: boolean[],
  isExecuted: boolean,
}
export interface TraceItem extends TypedRecord<TraceItem>, ITraceItem {} 
export const TraceItemFactory = makeTypedFactory<ITraceItem, TraceItem>({
  op: undefined,
  stack: 'INVALID' as any,
  altStack: 'INVALID' as any,
  execStack: [],
  isExecuted: false,
});

interface IWebSocketTransactionSource {
  type: 'websocket',
  url: string,
}
export interface WebSocketTransactionSource extends TypedRecord<WebSocketTransactionSource>, IWebSocketTransactionSource {} 
export const WebSocketTransactionSourceFactory = makeTypedFactory<IWebSocketTransactionSource, WebSocketTransactionSource>({
  type: 'websocket',
  url: 'INVALID',
});

interface IJsonTransactionSource {
  type: 'json',
  json: string,
}
export interface JsonTransactionSource extends TypedRecord<JsonTransactionSource>, IJsonTransactionSource {} 
export const JsonTransactionSourceFactory = makeTypedFactory<IJsonTransactionSource, JsonTransactionSource>({
  type: 'json',
  json: 'INVALID',
});

interface IHexTransactionSource {
  type: 'hex',
  hex: string,
}
export interface HexTransactionSource extends TypedRecord<HexTransactionSource>, IHexTransactionSource {} 
export const HexTransactionSourceFactory = makeTypedFactory<IHexTransactionSource, HexTransactionSource>({
  type: 'hex',
  hex: 'INVALID',
});

export type TransactionSource = WebSocketTransactionSource
                              | JsonTransactionSource
                              | HexTransactionSource;


