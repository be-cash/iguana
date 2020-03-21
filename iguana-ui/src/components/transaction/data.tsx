import React from 'react';
import { TraceItem } from "./state";
import { StackItem, ByteArray } from "iguana-lib";
import hex from 'hex-string';
import { Popover, Button } from 'antd';
import { List } from 'immutable';


export function breakString(s: string, lineLen: number): string {
  let lines = []
  while (s.length > lineLen) {
    lines.push(s.substr(0, lineLen));
    s = s.substr(lineLen);
  }
  lines.push(s);
  return lines.join('\n')
}

type PreparedStackItem = ReturnType<typeof prepareStackItem>;
function prepareStackItem(traceItem: TraceItem, stackItem: StackItem, limit: number | undefined) {
  const data = stackItem.data();
  let formatted = undefined;
  let formattedAlt = '';
  let type = '';
  let bytearray = undefined;
  switch (typeof data) {
    case 'bigint':
    case 'number':
      formatted = data.toString(10);
      formattedAlt = '0x' + data.toString(16);
      type = 'int';
      break;
    case 'boolean':
      formatted = data ? 'OP_TRUE' : 'OP_FALSE';
      type = 'boolean';
      break;
    default:
      if (data instanceof ByteArray) {
        formatted = breakString(data.hex(), 77);
        formattedAlt = data.hexdump();
        bytearray = data;
        type = 'bytearray';
      } else {
        formatted = `unknown: ${JSON.stringify(data)}`;
        type = 'unknown';
      }
      break;
  }
  const name = stackItem.name();
  const max = (limit || 16) - 1;
  return {
    name: name,
    dataShort: formatted.length < max ? formatted : formatted.substr(0, max) + '…',
    data: formatted,
    dataAlt: formattedAlt,
    delta: stackItem.delta().toLowerCase(),
    isExecuted: traceItem.isExecuted,
    bytearray,
    type,
  }
}

export const renderPreparedStackItem = (selectComparedArray: (byteArray: ByteArray | undefined, side: 'A' | 'B') => void) => 
                                       (preparedItem: PreparedStackItem | undefined) => {
  if (preparedItem === undefined)
    return <div></div>;
  const isExecutedClass = preparedItem.isExecuted ? '' : ' not-executed';
  return [
    <Popover
      key={0}
      trigger="click"
      content={<div className="stack-item-popover">
        <div>
          Type: {preparedItem.type}
          &nbsp;
          {preparedItem.bytearray ? <span>
            <Button onClick={() => selectComparedArray(preparedItem.bytearray, 'A')}>A</Button>
            &nbsp;
            <Button onClick={() => selectComparedArray(preparedItem.bytearray, 'B')}>B</Button>
          </span> : undefined}
        </div>
        <div>Name: {preparedItem.name}</div>
        <pre>{preparedItem.data}</pre>
        <hr />
        <pre>{preparedItem.dataAlt}</pre>
      </div>}
    >
      <div className={'stack-item-background delta-' + preparedItem.delta + isExecutedClass}></div>
    </Popover>,
    <div className={'stack-item' + isExecutedClass} key={1}>
      <div className="stack-item-name">{preparedItem.name}</div>
      <div className="stack-item-data">{preparedItem.dataShort}</div>
    </div>,
  ];
}

export function prepareTrace(trace: List<TraceItem>) {
  const maxStackHeight = trace.map(item => item.stack.numItems()).max() || 0;
  const maxAltStackHeight = trace.map(item => item.altStack.numItems()).max() || 0;
  const stackHeightMaxName: (number | undefined)[] = [];
  const altStackHeightMaxName: (number | undefined)[] = [];
  const codeWidth = 30;
  const letterWidth = 7;
  const columns: any[] = [
    {
      title: '#',
      dataIndex: 'idx',
      key: 'idx',
      fixed: 'left',
      className: 'column-info',
    },
    {
      title: 'Code',
      dataIndex: 'srcCode',
      key: 'srcCode',
      fixed: 'left',
      className: 'column-info',
      render: (src: any) => <pre
        className="code"
        style={{
          width: `${codeWidth * letterWidth}px`,
        }}
      >
        {src}
      </pre>,
    },
    {
      title: '#bytes',
      dataIndex: 'numBytes',
      key: 'numBytes',
      className: 'column-info',
    },
    {
      title: '#ops',
      dataIndex: 'numNonPushOps',
      key: 'numNonPushOps',
      className: 'column-info',
    },
  ];
  const stackItemColumns = [];
  for (let i = 0; i < maxStackHeight; ++i) {
    stackItemColumns.push({
      title: `${i}`,
      dataIndex: 'stackItem' + i,
      key: 'stackItem' + i,
    });
    stackHeightMaxName.push(
      trace
        .map(item => {
          if (item.stack.numItems() <= i)
            return 0;
          return item.stack.itemAt(i).name()?.length || 0;
        })
        .max()
    );
  }
  for (let i = 0; i < maxAltStackHeight; ++i) {
    stackItemColumns.push({
      title: `Alt ${i}`,
      dataIndex: 'altStackItem' + i,
      key: 'altStackItem' + i,
    });
    altStackHeightMaxName.push(
      trace
        .map(item => {
          if (item.altStack.numItems() <= i)
            return 0;
          return item.altStack.itemAt(i).name()?.length || 0;
        })
        .max()
    );
  }
  let numBytes = 0;
  let numNonPushOps = 0;
  const data = trace.map((traceItem, idx) => {
    numBytes += traceItem.op?.byteSize() || 0;
    numNonPushOps += !traceItem.op || traceItem.op.isPushOp() ? 0 : 1;
    const row: any = {};
    row['key'] = idx;
    row['idx'] = idx;
    switch (traceItem.op?.name()) {
      case 'code':
      case 'invalid':
        row['opcode'] = traceItem.op.data();
        break;
      case 'bytearray':
      case 'bool':
      case 'int':
        const names = traceItem.op.pushedNames();
        if (names === undefined || names.length == 0)
          row['opcode'] = `PUSHDATA (${traceItem.op.name()})`;
        else
          row['opcode'] = `<${names[0]}>`;
        break;
    }
    row['numBytes'] = numBytes;
    row['numNonPushOps'] = numNonPushOps;
    row['srcCode'] = traceItem.op?.srcCode(codeWidth)?.trimEnd();
    traceItem.stack.items().forEach((stackItem: StackItem, stackItemIdx: number) => {
      row['stackItem' + stackItemIdx] = prepareStackItem(traceItem, stackItem, stackHeightMaxName[stackItemIdx]);
    });
    traceItem.altStack.items().forEach((stackItem: StackItem, stackItemIdx: number) => {
      row['altStackItem' + stackItemIdx] = prepareStackItem(traceItem, stackItem, altStackHeightMaxName[stackItemIdx]);
    });
    return row;
  }).toArray();
  return {columns, data, stackItemColumns};
}
