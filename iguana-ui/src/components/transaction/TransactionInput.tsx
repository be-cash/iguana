import * as React from 'react';
import { Table } from 'antd';
import { connect, ConnectedProps } from 'react-redux';
import { RootState } from '../../state/rootstate';
import { TransactionInput } from './state';
import './TransactionInput.css';
import { ByteArray } from 'iguana-lib';
import { makeAction } from '../../state/rootaction';
import { SELECT_COMPARED_BYTE_ARRAY } from '../inspect-box/actions';
import { renderPreparedStackItem } from './data';


interface PropsFromReact {
  input: TransactionInput
}

const mapState = (state: RootState, p: PropsFromReact) => ({
  
})

const mapDispatch = {
  selectComparedArray: (byteArray: ByteArray | undefined, side: 'A' | 'B') => makeAction({
    type: SELECT_COMPARED_BYTE_ARRAY,
    byteArray,
    side,
  }),
}

const connector = connect(mapState, mapDispatch)
type PropsFromRedux = ConnectedProps<typeof connector>
type Props = PropsFromRedux & PropsFromReact

const TransactionInput = ({input, selectComparedArray}: Props) => {
  return <Table
    className="stack-trace-table"
    columns={input.columns.concat(input.stackItemColumns.map(column => ({
      ...column,
      render: renderPreparedStackItem(selectComparedArray),
    })))}
    dataSource={input.data}
    scroll={{x: true}}
    size="small"
    pagination={{
      pageSize: 50,
    }}
  />
}

export default connector(TransactionInput)
