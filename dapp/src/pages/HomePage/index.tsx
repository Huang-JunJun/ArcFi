import { Card, Button, Space, Typography, Row, Col } from 'antd';
import { Link } from 'react-router-dom';
import { useWallet } from '../../hooks/useWallet';
import WalletInfo from '../../components/WalletInfo/WalletInfo';

const { Title, Paragraph, Text } = Typography;

const HomePage = () => {
  const { address, chainId, chainNetwork, balance, connectWallet, disconnectWallet } = useWallet();

  const moduleCardStyle: React.CSSProperties = {
    width: '100%',
    height: 220,
  };

  return (
    <Space orientation="vertical" size="large" className="page-stack">
      <Card className="hero-card" bordered={false}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Title level={2} className="page-title">
              ArcFi 控制台
            </Title>
            <Paragraph className="page-subtitle">
              一个聚合质押、金库、流动性池与代币操作的 DeFi 控制台。
            </Paragraph>
          </Space>

          {address ? (
            <WalletInfo
              address={address}
              chainId={chainId}
              chainNetwork={chainNetwork}
              balance={balance}
              onDisconnect={disconnectWallet}
            />
          ) : (
            <div className="empty-state-inner">
              <Paragraph className="section-note" style={{ marginTop: 0 }}>
                连接钱包后即可查看 ArcFi 的链上资产信息，并进入金库、流动性池、质押与代币操作模块。
              </Paragraph>
              <Button type="primary" size="large" onClick={connectWallet}>
                连接钱包
              </Button>
            </div>
          )}
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card hoverable className="surface-card module-card" style={moduleCardStyle}>
            <div className="module-card-inner">
              <Space orientation="vertical" size="small">
                <Text className="metric-label">代币</Text>
                <Title level={4} style={{ marginBottom: 0 }}>
                  代币操作
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  管理代币总量、转账、授权额度与关键合约地址信息。
                </Paragraph>
              </Space>
              <Link to="/token">
                <Button type="primary" block size="large">
                  进入代币操作
                </Button>
              </Link>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} lg={6}>
          <Card hoverable className="surface-card module-card" style={moduleCardStyle}>
            <div className="module-card-inner">
              <Space orientation="vertical" size="small">
                <Text className="metric-label">金库</Text>
                <Title level={4} style={{ marginBottom: 0 }}>
                  金库
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  查看金库余额与合约版本，并完成 ETH 的存入与取出。
                </Paragraph>
              </Space>
              <Link to="/vault">
                <Button type="primary" block size="large">
                  进入金库
                </Button>
              </Link>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} lg={6}>
          <Card hoverable className="surface-card module-card" style={moduleCardStyle}>
            <div className="module-card-inner">
              <Space orientation="vertical" size="small">
                <Text className="metric-label">质押</Text>
                <Title level={4} style={{ marginBottom: 0 }}>
                  质押
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  跟踪质押数量、奖励状态，并管理奖励注入与派发流程。
                </Paragraph>
              </Space>
              <Link to="/staking">
                <Button type="primary" block size="large">
                  进入质押
                </Button>
              </Link>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} lg={6}>
          <Card hoverable className="surface-card module-card" style={moduleCardStyle}>
            <div className="module-card-inner">
              <Space orientation="vertical" size="small">
                <Text className="metric-label">流动性池</Text>
                <Title level={4} style={{ marginBottom: 0 }}>
                  流动性池
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  查看池子资产与份额占比，并完成流动性存入与赎回。
                </Paragraph>
              </Space>
              <Link to="/bank">
                <Button type="primary" block size="large">
                  进入流动性池
                </Button>
              </Link>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} lg={6}>
          <Card hoverable className="surface-card module-card" style={moduleCardStyle}>
            <div className="module-card-inner">
              <Space orientation="vertical" size="small">
                <Text className="metric-label">实验</Text>
                <Title level={4} style={{ marginBottom: 0 }}>
                  Wagmi 实验
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  使用 wagmi 连接钱包，读取 ETH 余额，并展示当前 Chain ID。
                </Paragraph>
              </Space>
              <Link to="/wagmi-demo">
                <Button type="primary" block size="large">
                  进入 Wagmi 实验
                </Button>
              </Link>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="surface-card" bordered={false}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Title level={4} className="section-title">
            平台概览
          </Title>
          <Row gutter={[16, 16]} className="metric-grid">
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" bordered={false}>
                <Text className="metric-label">当前钱包</Text>
                <Text className="metric-value">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '未连接'}
                </Text>
                <Text className="metric-meta">支持一键进入各模块进行链上操作</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" bordered={false}>
                <Text className="metric-label">当前网络</Text>
                <Text className="metric-value">{chainNetwork || '未连接'}</Text>
                <Text className="metric-meta">Chain ID: {chainId ?? '-'}</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" bordered={false}>
                <Text className="metric-label">钱包余额</Text>
                <Text className="metric-value">{balance ? `${balance} ETH` : '-'}</Text>
                <Text className="metric-meta">连接后自动读取当前钱包的 ETH 余额</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" bordered={false}>
                <Text className="metric-label">已接入模块</Text>
                <Text className="metric-value">5</Text>
                <Text className="metric-meta">代币、金库、流动性池、质押与 Wagmi 实验模块已上线</Text>
              </Card>
            </Col>
          </Row>

          <Paragraph className="section-note" style={{ marginBottom: 0 }}>
            ArcFi 当前已覆盖钱包连接、金库读写、流动性池份额查看、质押交互与代币管理等核心流程，
            页面结构将这些链上操作整理为统一的暗色控制台体验。
          </Paragraph>
        </Space>
      </Card>
    </Space>
  );
};

export default HomePage;
