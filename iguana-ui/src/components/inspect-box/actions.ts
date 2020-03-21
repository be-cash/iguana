import { ByteArray } from "iguana-lib";

export const SELECT_COMPARED_BYTE_ARRAY = 'SELECT_COMPARED_BYTE_ARRAY';
export interface SelectComparedByteArrayAction {
  type: typeof SELECT_COMPARED_BYTE_ARRAY,
  byteArray: ByteArray | undefined,
  side: 'A' | 'B',
}

export const COMPARE_BYTE_ARRAYS = 'COMPARE_BYTE_ARRAYS';
export interface CompareByteArraysAction {
  type: typeof COMPARE_BYTE_ARRAYS,
  byteArrayA: ByteArray | undefined,
  byteArrayB: ByteArray | undefined,
}

export const EXPAND_INSPECT_BOX = 'EXPAND_INSPECT_BOX';
export interface ExpandInfoBoxAction {
  type: typeof EXPAND_INSPECT_BOX,
  isExpanded: boolean,
}

export type InspectAction = SelectComparedByteArrayAction
                          | CompareByteArraysAction
                          | ExpandInfoBoxAction;
