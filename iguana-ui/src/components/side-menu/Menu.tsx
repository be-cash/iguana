import React from 'react';

import { Menu } from 'antd';
import { RootState } from '../../state/rootstate';
import { connect, ConnectedProps } from 'react-redux';
import { SELECT_TRANSACTION } from './actions';
import { makeAction } from '../../state/rootaction';
import { List } from 'immutable';

interface PropsFromReact {}

const mapState = (state: RootState, p: PropsFromReact) => ({
  transactions: state.transactions,
})

const mapDispatch = {
  selectTransaction: (uid: number, inputIdx?: number) => makeAction({
    type: SELECT_TRANSACTION,
    selectedTransactionUid: uid,
    selectedInputIdx: inputIdx,
  }),
}

const connector = connect(mapState, mapDispatch)

type PropsFromRedux = ConnectedProps<typeof connector>

type Props = PropsFromRedux & PropsFromReact


const SideMenu = (props: Props) => {
  return (
    <Menu
      mode="horizontal"
      theme="dark"
      defaultOpenKeys={['key1']}
    >
      <Menu.Item>Main</Menu.Item>
      {
        props.transactions.size == 1 ?
          (() => {
            const uid = props.transactions.keySeq().get(0)!;
            const transaction = props.transactions.get(uid)!;
            const hex = transaction.tx?.hashHex().substr(0, 12);
            return List([
              <Menu.Item onClick={() => props.selectTransaction(uid)} key={-1}>
                {transaction.name && hex ?
                  `${transaction.name} (${hex})` :
                  transaction.name || hex}
              </Menu.Item>
            ]).concat(
              transaction.inputs.map((_, inputIdx) => {
                return <Menu.Item onClick={() => props.selectTransaction(uid, inputIdx)} key={inputIdx}>
                  Input #{inputIdx}
                </Menu.Item>
              })
            )
          })() :
          props.transactions.map((transaction, uid) => {
            const hex = transaction.tx?.hashHex().substr(0, 12);
            return <Menu.SubMenu
              title={transaction.name && hex ?
                      `${transaction.name} (${hex})` :
                      transaction.name || hex}
              key={uid}
              onTitleClick={() => props.selectTransaction(uid)}
            >
              {transaction.inputs.map((_, inputIdx) => {
                return <Menu.Item onClick={() => props.selectTransaction(uid, inputIdx)} key={inputIdx}>
                  Input #{inputIdx}
                </Menu.Item>
              })}
            </Menu.SubMenu>;
          }).toList()
      }
    </Menu>
  );
};

export default connector(SideMenu);
