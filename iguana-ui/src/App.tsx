import React from 'react';
import './App.css';

import { Layout, Menu } from 'antd';
import 'antd/dist/antd.css';
import SideMenu from './components/side-menu/Menu';
import DebugContent from './components/debug-content/DebugContent';

const { Header, Footer, Sider, Content } = Layout;

function App() {
  return (
    <Layout>
      <Header><h1 id="page-header">Iguana Bitcoin Cash Debugger</h1></Header>
      <Content>
        <SideMenu />
        <DebugContent />
      </Content>
      <Footer>footer</Footer>
    </Layout>
  );
}

export default App;
