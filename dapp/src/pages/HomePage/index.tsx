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
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        <Title level={2} style={{ marginBottom: 0 }}>
          ArcFi Dashboard
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          A modular DeFi dashboard for staking, vaults, pools, and token operations.
        </Paragraph>
      </Space>

      <Card hoverable>
        <Title level={3}>Connected Wallet</Title>
        {address ? (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <WalletInfo
              address={address}
              chainId={chainId}
              chainNetwork={chainNetwork}
              balance={balance}
              onDisconnect={disconnectWallet}
            />
          </Space>
        ) : (
          <Button type="primary" onClick={connectWallet}>
            连接 MetaMask
          </Button>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card hoverable style={moduleCardStyle}>
            <Space orientation="vertical" size="small">
              <Title level={4} style={{ marginBottom: 0 }}>
                Token Operations
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Manage token supply, transfers, approvals, and core token metadata.
              </Paragraph>
            </Space>
            <Link to="/token">
              <Button type="primary" block>
                Open Token Operations
              </Button>
            </Link>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} lg={6}>
          <Card hoverable style={moduleCardStyle}>
            <Space orientation="vertical" size="small">
              <Title level={4} style={{ marginBottom: 0 }}>
                Vault
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Review vault balances, contract status, and manage deposits or withdrawals.
              </Paragraph>
            </Space>
            <Link to="/vault">
              <Button type="primary" block>
                Open Vault
              </Button>
            </Link>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} lg={6}>
          <Card hoverable style={moduleCardStyle}>
            <Space orientation="vertical" size="small">
              <Title level={4} style={{ marginBottom: 0 }}>
                Staking
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Stake tokens, monitor rewards, and manage reward distribution flows.
              </Paragraph>
            </Space>
            <Link to="/staking">
              <Button type="primary" block>
                Open Staking
              </Button>
            </Link>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} lg={6}>
          <Card hoverable style={moduleCardStyle}>
            <Space orientation="vertical" size="small">
              <Title level={4} style={{ marginBottom: 0 }}>
                Liquidity Pool
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Track pooled assets, shares, and liquidity entry or exit actions.
              </Paragraph>
            </Space>
            <Link to="/bank">
              <Button type="primary" block>
                Open Liquidity Pool
              </Button>
            </Link>
          </Card>
        </Col>
      </Row>

      <Card hoverable>
        <Title level={4}>Platform Overview</Title>
        <Paragraph>
          <Text>
            ArcFi currently supports wallet connectivity, vault deposits and withdrawals, liquidity
            pool monitoring, staking interactions, and token management workflows.
          </Text>
          <br />
          <Text>
            The current interface is organized around modular DeFi actions so each workflow can be
            operated from a dedicated dashboard page.
          </Text>
        </Paragraph>
      </Card>
    </Space>
  );
};

export default HomePage;
