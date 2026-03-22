import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Button, Descriptions, Space, Input, Typography, Divider, message } from 'antd';
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
      <Card>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Typography.Title level={3}>Vault</Typography.Title>
          <Typography.Text>Connect your wallet to load vault data.</Typography.Text>
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
        <Typography.Title level={3}>Vault</Typography.Title>

        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Wallet Address">{address}</Descriptions.Item>
            <Descriptions.Item label="Contract Version">{version || '-'}</Descriptions.Item>
            <Descriptions.Item label="Vault Balance">
              {balance ? `${balance} ETH` : '-'}
            </Descriptions.Item>
          </Descriptions>
          <Button
            type="default"
            loading={infoLoading}
            disabled={infoLoading || txBusy}
            onClick={handleLoadInfo}
          >
            Refresh Vault Data
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
          <Typography.Title level={5}>Withdraw ETH</Typography.Title>
          <Space orientation="horizontal" size="middle">
            <Input
              placeholder="Enter withdraw amount, e.g. 0.05"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              style={{ width: 200 }}
              disabled={infoLoading || txBusy}
            />
            <Button
              danger
              type="primary"
              loading={withdrawLoading}
              disabled={infoLoading || txBusy}
              onClick={handleWithdraw}
            >
              Withdraw
            </Button>
          </Space>
        </Space>

      </Space>
    </Card>
  );
};

export default VaultPage;
