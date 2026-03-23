import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

const { Header, Content } = Layout;

const MainLayout = () => {
  return (
    <Layout style={{ minHeight: '100vh' }} className="app-shell">
      <Header
        className="app-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          height: 'auto',
          lineHeight: 'normal',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div className="app-brand">
          <span className="app-brand-title">ArcFi 控制台</span>
          <span className="app-brand-subtitle">暗色风格 DeFi 管理面板</span>
        </div>
        <a
          href="/"
          className="app-nav-link"
          style={{
            color: 'white',
            fontSize: 16,
          }}
        >
          控制台首页
        </a>
      </Header>

      <Content className="app-content" style={{ padding: 24 }}>
        <div className="page-shell">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
};

export default MainLayout;
