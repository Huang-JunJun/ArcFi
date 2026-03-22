import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Button, Descriptions, Space, Input, Typography, Divider, message } from 'antd';
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
      <Card>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Typography.Title level={3}>Liquidity Pool</Typography.Title>
          <Typography.Text>Connect your wallet before adding or removing liquidity.</Typography.Text>
          <Button type="primary" onClick={connectWallet}>
            连接钱包
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <Card>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={3}>Liquidity Pool</Typography.Title>

        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Total Assets">
              {formatAmount(totalAssets, 4)} ETH
            </Descriptions.Item>

            <Descriptions.Item label="Total Shares">{formatAmount(totalShares, 4)}</Descriptions.Item>

            <Descriptions.Item label="Your Shares">{formatAmount(userShares, 4)}</Descriptions.Item>

            <Descriptions.Item label="Withdraw Preview">
              {formatAmount(previewAssets, 4)} ETH
            </Descriptions.Item>
          </Descriptions>

          <Button
            type="default"
            loading={infoLoading}
            disabled={infoLoading || txBusy}
            onClick={handleRefresh}
          >
            Refresh Pool Data
          </Button>
        </Space>

        <Divider />

        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Title level={5}>Deposit ETH</Typography.Title>
          <Space orientation="horizontal" size="middle">
            <Input
              placeholder="Enter deposit amount, e.g. 0.1"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              style={{ width: 200 }}
              disabled={infoLoading || txBusy}
            />
            <Button
              type="primary"
              loading={depositLoading}
              disabled={infoLoading || txBusy}
              onClick={handleDeposit}
            >
              Deposit
            </Button>
          </Space>
        </Space>

        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Title level={5}>Redeem Shares</Typography.Title>
          <Space orientation="horizontal" size="middle">
            <Input
              placeholder="Enter shares to redeem"
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
              Redeem
            </Button>
          </Space>
        </Space>
      </Space>
    </Card>
  );
};

export default BankPoolPage;
