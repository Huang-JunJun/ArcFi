import { useEffect, useState } from 'react';
import { Button, Card, Col, Row, Space, Typography } from 'antd';
import {
  useBalance,
  useChainId,
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import tokenABI from '@/abis/MyTokenV2.json';
import { MYTOKENV2_ADDRESS, STAKING_POOL_ADDRESS } from '@/config';

const { Title, Paragraph, Text } = Typography;

const getChainName = (chainId?: number, chainName?: string) => {
  if (chainId === 31337 || chainId === 1337) return 'localhost';
  if (chainId === 11155111) return 'sepolia';
  if (chainId === 1) return 'ethereum';
  if (chainId) return chainName || `未知网络 (${chainId})`;
  return '未连接';
};

const formatBalance = (value: bigint, decimals: number, symbol: string) => {
  return `${Number(formatUnits(value, decimals)).toFixed(4)} ${symbol}`;
};

const formatErrorMessage = (error: Error) => {
  if (error.message.includes('HTTP request failed') || error.message.includes('Failed to fetch')) {
    return '余额读取失败：当前网络 RPC 请求失败，请稍后刷新或切回本地网络。';
  }
  return `余额读取失败：${error.message.split('\n')[0]}`;
};

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: 'chainChanged', listener: (chainId: string) => void) => void;
  removeListener?: (event: 'chainChanged', listener: (chainId: string) => void) => void;
};

const getInjectedProvider = () => {
  return (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
};

const parseHexChainId = (chainId: string) => Number.parseInt(chainId, 16);

const formatHexEthBalance = (value: string) => formatBalance(BigInt(value), 18, 'ETH');

const toSupportedBalanceChainId = (chainId?: number) => {
  if (chainId === 31337 || chainId === 11155111 || chainId === 1) return chainId;
  return undefined;
};

const WagmiDemoPage = () => {
  const fallbackChainId = useChainId();
  const { address, chain, chainId, isConnected, status } = useConnection();
  const connectors = useConnectors();
  const { mutate: connect, isPending, error: connectError } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const [manualChainId, setManualChainId] = useState<number>();
  const [manualBalance, setManualBalance] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const currentChainId = manualChainId ?? chainId ?? fallbackChainId;
  const currentChainName = getChainName(
    currentChainId,
    currentChainId === chain?.id ? chain.name : undefined,
  );
  const balanceChainId = toSupportedBalanceChainId(currentChainId);
  const {
    data: totalSupply,
    isLoading: totalSupplyLoading,
    error: totalSupplyError,
    refetch: refetchTotalSupply,
  } = useReadContract({
    address: MYTOKENV2_ADDRESS as `0x${string}`,
    abi: tokenABI.abi,
    functionName: 'totalSupply',
    chainId: balanceChainId,
    query: {
      enabled: Boolean(balanceChainId),
    },
  });
  const {
    data: balance,
    isLoading: balanceLoading,
    isFetching: balanceFetching,
    error: balanceError,
    refetch: refetchBalance,
  } = useBalance({
    address,
    chainId: balanceChainId,
    query: {
      enabled: Boolean(address),
    },
  });
  const { writeContract, isPending, error } = useWriteContract();
  const handleApprove = () => {
    writeContract({
      address: MYTOKENV2_ADDRESS as `0x${string}`,
      abi: tokenABI.abi,
      functionName: 'approve',
      args: [STAKING_POOL_ADDRESS, parseUnits('1000', 18)],
    });
  };
  useEffect(() => {
    if (chainId) {
      setManualChainId(undefined);
    }
  }, [chainId]);

  useEffect(() => {
    setManualBalance(undefined);
  }, [address]);

  useEffect(() => {
    const ethereum = getInjectedProvider();
    if (!ethereum?.on) return;

    const handleChainChanged = async (nextChainId: string) => {
      setManualChainId(parseHexChainId(nextChainId));
      setManualBalance(undefined);

      if (!address) return;
      try {
        const rawBalance = await ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
        if (typeof rawBalance === 'string') {
          setManualBalance(formatHexEthBalance(rawBalance));
        }
      } catch {
        setManualBalance(undefined);
      }
    };

    ethereum.on('chainChanged', handleChainChanged);
    return () => {
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [address]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const ethereum = getInjectedProvider();
      const rawChainId = await ethereum?.request({ method: 'eth_chainId' });

      if (typeof rawChainId === 'string') {
        setManualChainId(parseHexChainId(rawChainId));
      }

      if (address && ethereum) {
        const rawBalance = await ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
        if (typeof rawBalance === 'string') {
          setManualBalance(formatHexEthBalance(rawBalance));
        }
      } else if (address) {
        await refetchBalance();
      }
      await refetchTotalSupply?.();
    } finally {
      setRefreshing(false);
    }
  };

  const visibleConnectors =
    connectors.length > 1
      ? connectors.filter((connector) => connector.name !== 'Injected')
      : connectors;

  return (
    <Space orientation="vertical" size="large" className="page-stack">
      <Card className="hero-card" variant="borderless">
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
            <Col xs={24} md={6}>
              <Card className="metric-card" variant="borderless">
                <Text className="metric-label">Token 总供应量</Text>
                <Text className="metric-value">
                  {totalSupplyLoading
                    ? '读取中'
                    : totalSupply
                      ? `${Number(formatUnits(totalSupply as bigint, 18)).toFixed(4)} MTK2`
                      : '-'}
                  {totalSupplyError && (
                    <Text type="danger">Token 总供应量读取失败：{totalSupplyError.message}</Text>
                  )}
                </Text>
                <Text className="metric-meta">useReadContract 读取 MyTokenV2.totalSupply</Text>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card className="metric-card" variant="borderless">
                <Text className="metric-label">连接状态</Text>
                <Text className="metric-value">{isConnected ? '已连接' : '未连接'}</Text>
                <Text className="metric-meta">wagmi status: {status}</Text>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card className="metric-card" variant="borderless">
                <Text className="metric-label">当前 Chain</Text>
                <Text className="metric-value">{currentChainName}</Text>
                <Text className="metric-meta">Chain ID: {currentChainId ?? '-'}</Text>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card className="metric-card" variant="borderless">
                <Text className="metric-label">当前钱包 ETH</Text>
                <Text className="metric-value">
                  {manualBalance
                    ? manualBalance
                    : balanceLoading || balanceFetching
                      ? '读取中'
                      : balance
                        ? formatBalance(balance.value, balance.decimals, balance.symbol)
                        : '-'}
                </Text>
                <Text className="metric-meta">通过钱包 RPC / wagmi 读取</Text>
              </Card>
            </Col>
          </Row>
        </Space>
      </Card>

      <Card className="section-card" variant="borderless" title="钱包连接">
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card className="metric-card" variant="borderless">
                <Text className="metric-label">当前地址</Text>
                <Text className="metric-value" style={{ wordBreak: 'break-all' }}>
                  {address || '-'}
                </Text>
                <Text className="metric-meta">是否已连接：{isConnected ? '是' : '否'}</Text>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="metric-card" variant="borderless">
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
            <Button type="default" size="large" loading={refreshing} onClick={handleRefresh}>
              刷新状态
            </Button>
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
          {balanceError && !manualBalance && (
            <Text type="danger">{formatErrorMessage(balanceError)}</Text>
          )}
        </Space>
      </Card>
    </Space>
  );
};

export default WagmiDemoPage;
