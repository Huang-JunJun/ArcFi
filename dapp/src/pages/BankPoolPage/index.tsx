import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Button, Descriptions, Space, Input, Typography, message, Row, Col } from 'antd';
import { useWallet } from '../../hooks/useWallet';
import { useBankPool } from '../../hooks/useBankPool';
import { formatAmount } from '@/common/utils';
import { humanizeEthersError } from '@/common/humanizeEthersError';

const BankPoolPage = () => {
  const { provider, address, connectWallet, signer } = useWallet();
  const {
    loadTotalAssets,
    loadTotalShares,
    loadUserShares,
    loadPreviewWithdraw,
    deposit,
    withdraw,
  } = useBankPool(provider);

  const [totalAssets, setTotalAssets] = useState('');
  const [totalShares, setTotalShares] = useState('');
  const [userShares, setUserShares] = useState('');
  const [previewAssets, setPreviewAssets] = useState<string | null>(null);

  const [infoLoading, setInfoLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const txBusy = depositLoading || withdrawLoading;

  const infoRequestIdRef = useRef(0);

  const refreshInfo = useCallback(async (): Promise<boolean> => {
    if (!address) return false;

    const requestId = ++infoRequestIdRef.current;
    try {
      setInfoLoading(true);
      const [assets, shares, user, preview] = await Promise.all([
        loadTotalAssets(),
        loadTotalShares(),
        loadUserShares(address),
        loadPreviewWithdraw(address),
      ]);
      if (infoRequestIdRef.current !== requestId) return false;
      setTotalAssets(assets);
      setTotalShares(shares);
      setUserShares(user);
      setPreviewAssets(preview);
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
  }, [address, loadPreviewWithdraw, loadTotalAssets, loadTotalShares, loadUserShares]);

  const handleRefresh = async () => {
    const ok = await refreshInfo();
    if (ok) message.success('池子信息已刷新');
  };

  useEffect(() => {
    if (!provider || !address) {
      return;
    }
    void refreshInfo();
  }, [address, provider, refreshInfo]);

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
      setDepositAmount('');
      await refreshInfo();
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
      if (!withdrawShares) {
        message.warning('请输入赎回份额');
        return;
      }
      setWithdrawLoading(true);
      await withdraw(withdrawShares, signer);
      message.success('赎回成功');
      setWithdrawShares('');
      await refreshInfo();
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (!address) {
    return (
      <Card className="empty-state-card" variant="borderless">
        <div className="empty-state-inner">
          <Typography.Title level={2} className="page-title">
            流动性池
          </Typography.Title>
          <Typography.Paragraph className="page-subtitle">
            连接钱包后可查看池子总资产、总份额与预计可取回金额，并完成流动性存入和赎回。
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
              流动性池
            </Typography.Title>
            <Typography.Paragraph className="page-subtitle">
              查看池子资产、份额结构与预估赎回结果，并执行流动性存入和赎回操作。
            </Typography.Paragraph>
          </Space>
          <div className="toolbar-actions">
            <Button
              type="default"
              size="large"
              loading={infoLoading}
              disabled={infoLoading || txBusy}
              onClick={handleRefresh}
            >
              刷新信息
            </Button>
          </div>
        </div>
      </Card>

      <Card className="surface-card" variant="borderless">
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={[16, 16]} className="metric-grid">
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">总资产</Typography.Text>
                <Typography.Text className="metric-value">{formatAmount(totalAssets, 4)} ETH</Typography.Text>
                <Typography.Text className="metric-meta">池子当前持有的 ETH 总量</Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">总份额</Typography.Text>
                <Typography.Text className="metric-value">{formatAmount(totalShares, 4)}</Typography.Text>
                <Typography.Text className="metric-meta">用于描述池子份额分配的总规模</Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">我的份额</Typography.Text>
                <Typography.Text className="metric-value">{formatAmount(userShares, 4)}</Typography.Text>
                <Typography.Text className="metric-meta">当前钱包在池子中的份额占比</Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">预计可取回</Typography.Text>
                <Typography.Text className="metric-value">{formatAmount(previewAssets, 4)} ETH</Typography.Text>
                <Typography.Text className="metric-meta">按当前份额估算的可赎回资产</Typography.Text>
              </Card>
            </Col>
          </Row>

          <Descriptions column={1} bordered className="summary-descriptions">
            <Descriptions.Item label="总资产">{formatAmount(totalAssets, 4)} ETH</Descriptions.Item>
            <Descriptions.Item label="总份额">{formatAmount(totalShares, 4)}</Descriptions.Item>
            <Descriptions.Item label="我的份额">{formatAmount(userShares, 4)}</Descriptions.Item>
            <Descriptions.Item label="预计可取回">{formatAmount(previewAssets, 4)} ETH</Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      <Row gutter={[16, 16]} className="page-actions-grid">
        <Col xs={24} lg={12}>
          <Card className="section-card" variant="borderless" title="存入">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Text className="section-note">
                向流动性池追加 ETH，份额会根据当前池子状态自动计算。
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
          <Card className="section-card" variant="borderless" title="赎回">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Text className="section-note">
                输入要赎回的份额数量，系统会根据当前份额价值估算可取回资产。
              </Typography.Text>
              <div className="form-row">
                <Input
                  placeholder="输入要赎回的份额数量"
                  value={withdrawShares}
                  onChange={(e) => setWithdrawShares(e.target.value)}
                  style={{ width: 240 }}
                  disabled={infoLoading || txBusy}
                />
                <Button
                  danger
                  type="primary"
                  loading={withdrawLoading}
                  disabled={infoLoading || txBusy}
                  onClick={handleWithdraw}
                >
                  赎回
                </Button>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default BankPoolPage;
