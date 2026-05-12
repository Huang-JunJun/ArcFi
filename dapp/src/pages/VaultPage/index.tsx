import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Button, Descriptions, Space, Input, Typography, message, Row, Col } from 'antd';
import { useWallet } from '../../hooks/useWallet';
import { useSimpleVault } from '../../hooks/useSimpleVault';
import { humanizeEthersError } from '@/common/humanizeEthersError';

const VaultPage = () => {
  const { provider, address, connectWallet, signer } = useWallet();
  const { loadVersion, loadVaultBalance, deposit, withdraw } = useSimpleVault(provider);

  const [version, setVersion] = useState('');
  const [balance, setBalance] = useState('');
  const [infoLoading, setInfoLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const txBusy = depositLoading || withdrawLoading;

  const infoRequestIdRef = useRef(0);

  const refreshInfo = useCallback(async (): Promise<boolean> => {
    if (!provider || !address) return false;

    const requestId = ++infoRequestIdRef.current;
    try {
      setInfoLoading(true);
      const [v, b] = await Promise.all([loadVersion(), loadVaultBalance()]);
      if (infoRequestIdRef.current !== requestId) return false;
      setVersion(v);
      setBalance(b);
      return true;
    } catch (e: any) {
      if (infoRequestIdRef.current !== requestId) return false;
      message.error(humanizeEthersError(e));
      return false;
    } finally {
      if (infoRequestIdRef.current === requestId) {
        setInfoLoading(false);
      }
    }
  }, [address, loadVaultBalance, loadVersion, provider]);

  const handleLoadInfo = async () => {
    if (!provider || !address) {
      message.warning('请先连接钱包');
      return;
    }
    const ok = await refreshInfo();
    if (ok) message.success('金库信息已刷新');
  };

  const handleDeposit = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!depositAmount) {
        message.warning('请输入存款金额');
        return;
      }
      setDepositLoading(true);
      await deposit(depositAmount, signer);
      message.success('存款成功');
      await refreshInfo();
      setDepositAmount('');
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!withdrawAmount) {
        message.warning('请输入取款金额');
        return;
      }
      setWithdrawLoading(true);
      await withdraw(withdrawAmount, signer);
      message.success('取款成功');
      await refreshInfo();
      setWithdrawAmount('');
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setWithdrawLoading(false);
    }
  };

  useEffect(() => {
    if (!provider || !address) {
      return;
    }
    void refreshInfo();
  }, [address, provider, refreshInfo]);

  if (!address) {
    return (
      <Card className="empty-state-card" variant="borderless">
        <div className="empty-state-inner">
          <Typography.Title level={2} className="page-title">
            金库
          </Typography.Title>
          <Typography.Paragraph className="page-subtitle">
            连接钱包后可查看金库余额与合约版本，并完成 ETH 的存入与取出。
          </Typography.Paragraph>
          <Button type="primary" size="large" onClick={connectWallet}>
            连接钱包
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Space orientation="vertical" size="large" className="page-stack">
      <Card className="hero-card" variant="borderless">
        <div className="toolbar-row">
          <Space orientation="vertical" size="small">
            <Typography.Title level={2} className="page-title">
              金库
            </Typography.Title>
            <Typography.Paragraph className="page-subtitle">
              管理金库资产、查看合约版本，并快速完成 ETH 的存入与取出。
            </Typography.Paragraph>
          </Space>
          <div className="toolbar-actions">
            <Button
              type="default"
              size="large"
              loading={infoLoading}
              disabled={infoLoading || txBusy}
              onClick={handleLoadInfo}
            >
              刷新信息
            </Button>
          </div>
        </div>
      </Card>

      <Card className="surface-card" variant="borderless">
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={[16, 16]} className="metric-grid">
            <Col xs={24} md={8}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">当前钱包地址</Typography.Text>
                <Typography.Text className="metric-value">{`${address.slice(0, 6)}...${address.slice(-4)}`}</Typography.Text>
                <Typography.Text className="metric-meta">当前连接钱包对应的链上地址</Typography.Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">合约版本</Typography.Text>
                <Typography.Text className="metric-value">{version || '-'}</Typography.Text>
                <Typography.Text className="metric-meta">用于确认当前金库前端对应的合约版本</Typography.Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">金库余额</Typography.Text>
                <Typography.Text className="metric-value">{balance ? `${balance} ETH` : '-'}</Typography.Text>
                <Typography.Text className="metric-meta">当前金库合约中持有的 ETH 数量</Typography.Text>
              </Card>
            </Col>
          </Row>

          <Descriptions column={1} bordered className="summary-descriptions">
            <Descriptions.Item label="当前钱包地址">{address}</Descriptions.Item>
            <Descriptions.Item label="合约版本">{version || '-'}</Descriptions.Item>
            <Descriptions.Item label="金库余额">{balance ? `${balance} ETH` : '-'}</Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      <Row gutter={[16, 16]} className="page-actions-grid">
        <Col xs={24} lg={12}>
          <Card className="section-card" variant="borderless" title="存入">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Text className="section-note">
                向金库合约存入 ETH，交易确认后会自动刷新最新余额。
              </Typography.Text>
              <div className="form-row">
                <Input
                  placeholder="输入存入金额，例如 0.1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  style={{ width: 220 }}
                  disabled={infoLoading || txBusy}
                />
                <Button
                  type="primary"
                  loading={depositLoading}
                  disabled={infoLoading || txBusy}
                  onClick={handleDeposit}
                >
                  存入
                </Button>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="section-card" variant="borderless" title="取出">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Text className="section-note">
                从金库中取出指定数量的 ETH，危险操作保留红色按钮样式。
              </Typography.Text>
              <div className="form-row">
                <Input
                  placeholder="输入取出金额，例如 0.05"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  style={{ width: 220 }}
                  disabled={infoLoading || txBusy}
                />
                <Button
                  danger
                  type="primary"
                  loading={withdrawLoading}
                  disabled={infoLoading || txBusy}
                  onClick={handleWithdraw}
                >
                  取出
                </Button>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default VaultPage;
