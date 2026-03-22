import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

const { Header, Content } = Layout;

const MainLayout = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <span>ArcFi Dashboard</span>
        <a
          href="/"
          style={{
            color: 'white',
            fontSize: 16,
          }}
        >
          Dashboard
        </a>
      </Header>

      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default MainLayout;
