import { Button, Card, Col, Row, Space, Typography } from 'antd';
import {
  useBalance,
  useChainId,
  useConnect,
  useConnection,
  useDisconnect,
} from 'wagmi';
import { formatUnits } from 'viem';

const { Title, Paragraph, Text } = Typography;

const getChainName = (chainId?: number, chainName?: string) => {
  if (chainId === 31337 || chainId === 1337) return 'localhost';
  if (chainId === 11155111) return 'sepolia';
  return chainName || '未连接';
};

const formatBalance = (value: bigint, decimals: number, symbol: string) => {
  return `${Number(formatUnits(value, decimals)).toFixed(4)} ${symbol}`;
};

const WagmiDemoPage = () => {
  const fallbackChainId = useChainId();
  const { address, chain, chainId, isConnected, status } = useConnection();
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
  } = useBalance({
    address,
    query: {
      enabled: Boolean(address),
    },
  });

  const currentChainId = chainId ?? fallbackChainId;
  const currentChainName = getChainName(currentChainId, chain?.name);
  const visibleConnectors =
    connectors.length > 1
      ? connectors.filter((connector) => connector.name !== 'Injected')
      : connectors;

  return (
    <Space orientation="vertical" size="large" className="page-stack">
      <Card className="hero-card" bordered={false}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Space orientation="vertical" size="small">
            <Title level={2} className="page-title">
              Wagmi 实验页
            </Title>
            <Paragraph className="page-subtitle">
              使用 wagmi 完成最小钱包连接、ETH 余额读取和 Chain ID 展示，不接入现有业务流程。
            </Paragraph>
          </Space>

          <Row gutter={[16, 16]} className="metric-grid">
            <Col xs={24} md={8}>
              <Card className="metric-card" bordered={false}>
                <Text className="metric-label">连接状态</Text>
                <Text className="metric-value">{isConnected ? '已连接' : '未连接'}</Text>
                <Text className="metric-meta">wagmi status: {status}</Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="metric-card" bordered={false}>
                <Text className="metric-label">当前 Chain</Text>
                <Text className="metric-value">{currentChainName}</Text>
                <Text className="metric-meta">Chain ID: {currentChainId ?? '-'}</Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="metric-card" bordered={false}>
                <Text className="metric-label">当前钱包 ETH</Text>
                <Text className="metric-value">
                  {balanceLoading
                    ? '读取中'
                    : balance
                      ? formatBalance(balance.value, balance.decimals, balance.symbol)
                      : '-'}
                </Text>
                <Text className="metric-meta">通过 wagmi useBalance 读取</Text>
              </Card>
            </Col>
          </Row>
        </Space>
      </Card>

      <Card className="section-card" bordered={false} title="钱包连接">
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card className="metric-card" bordered={false}>
                <Text className="metric-label">当前地址</Text>
                <Text className="metric-value" style={{ wordBreak: 'break-all' }}>
                  {address || '-'}
                </Text>
                <Text className="metric-meta">是否已连接：{isConnected ? '是' : '否'}</Text>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="metric-card" bordered={false}>
                <Text className="metric-label">当前网络</Text>
                <Text className="metric-value">{currentChainName}</Text>
                <Text className="metric-meta">Chain ID: {currentChainId ?? '-'}</Text>
              </Card>
            </Col>
          </Row>

          <div className="form-row">
            {visibleConnectors.map((connector) => (
              <Button
                key={connector.uid}
                type="primary"
                size="large"
                loading={isPending}
                disabled={isConnected}
                onClick={() => connect({ connector })}
              >
                连接 {connector.name}
              </Button>
            ))}
            <Button
              type="default"
              size="large"
              disabled={!isConnected}
              onClick={() => disconnect()}
            >
              断开连接
            </Button>
          </div>

          {connectError && <Text type="danger">连接失败：{connectError.message}</Text>}
          {balanceError && <Text type="danger">余额读取失败：{balanceError.message}</Text>}
        </Space>
      </Card>
    </Space>
  );
};

export default WagmiDemoPage;
