import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Space, Typography, Descriptions, Input, Button, Alert, message, Row, Col } from 'antd';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import tokenABI from '@/abis/MyTokenV2.json';
import { MYTOKENV2_ADDRESS, STAKING_POOL_ADDRESS } from '@/config';
import { humanizeEthersError } from '@/common/humanizeEthersError';

const TokenPage = () => {
  const { provider, signer, address, connectWallet } = useWallet();

  const [totalSupply, setTotalSupply] = useState('');
  const [balance, setBalance] = useState('');
  const [allowance, setAllowance] = useState('');
  const [tokenOwner, setTokenOwner] = useState('');

  const [mintAmount, setMintAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [approveAmount, setApproveAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const txBusy = loading;
  const isOwner =
    tokenOwner && address ? tokenOwner.toLowerCase() === address.toLowerCase() : false;

  const getTokenContract = useCallback(() => {
    if (!provider) {
      throw new Error('Provider not ready');
    }
    return new ethers.Contract(MYTOKENV2_ADDRESS, tokenABI.abi, provider);
  }, [provider]);

  const infoRequestIdRef = useRef(0);

  const refreshInfo = useCallback(async (): Promise<boolean> => {
    if (!provider || !address) {
      return false;
    }
    const requestId = ++infoRequestIdRef.current;
    try {
      const token = getTokenContract();
      const decimals = await token.decimals();

      const [owner, supply, bal, alw] = await Promise.all([
        token.owner(),
        token.totalSupply(),
        token.balanceOf(address),
        token.allowance(address, STAKING_POOL_ADDRESS),
      ]);

      if (infoRequestIdRef.current !== requestId) return false;
      setTokenOwner(owner);
      setTotalSupply(ethers.formatUnits(supply, decimals));
      setBalance(ethers.formatUnits(bal, decimals));
      setAllowance(ethers.formatUnits(alw, decimals));
      return true;
    } catch (e: any) {
      if (infoRequestIdRef.current !== requestId) return false;
      message.error(humanizeEthersError(e));
      return false;
    }
  }, [address, getTokenContract, provider]);

  useEffect(() => {
    if (provider && address) {
      void refreshInfo();
    }
  }, [address, provider, refreshInfo]);

  const handleMint = async () => {
    try {
      setLoading(true);
      if (!signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!mintAmount) {
        message.warning('请输入铸造数量');
        return;
      }
      const token = new ethers.Contract(MYTOKENV2_ADDRESS, tokenABI.abi, signer);
      const decimals = await token.decimals();
      const tx = await token.mint(ethers.parseUnits(mintAmount, decimals));
      await tx.wait();
      setMintAmount('');
      await refreshInfo();
      message.success('铸造成功');
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    try {
      setLoading(true);
      if (!signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!transferTo) {
        message.warning('请输入接收地址');
        return;
      }
      if (!transferAmount) {
        message.warning('请输入转账数量');
        return;
      }
      const token = new ethers.Contract(MYTOKENV2_ADDRESS, tokenABI.abi, signer);
      const decimals = await token.decimals();
      const tx = await token.transfer(transferTo, ethers.parseUnits(transferAmount, decimals));
      await tx.wait();
      setTransferTo('');
      setTransferAmount('');
      await refreshInfo();
      message.success('转账成功');
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      if (!signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!approveAmount) {
        message.warning('请输入授权数量');
        return;
      }
      const token = new ethers.Contract(MYTOKENV2_ADDRESS, tokenABI.abi, signer);
      const decimals = await token.decimals();
      const tx = await token.approve(
        STAKING_POOL_ADDRESS,
        ethers.parseUnits(approveAmount, decimals),
      );
      await tx.wait();
      setApproveAmount('');
      await refreshInfo();
      message.success('授权成功');
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    const ok = await refreshInfo();
    if (ok) message.success('代币信息已刷新');
  };

  if (!address) {
    return (
      <Card className="empty-state-card" variant="borderless">
        <div className="empty-state-inner">
          <Typography.Title level={2} className="page-title">
            代币操作
          </Typography.Title>
          <Typography.Paragraph className="page-subtitle">
            连接钱包后可查看代币供应量、钱包余额、授权额度，并执行铸造、转账与授权操作。
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
              代币操作
            </Typography.Title>
            <Typography.Paragraph className="page-subtitle">
              在这里查看代币关键信息，并管理铸造、转账和质押前授权等操作。
            </Typography.Paragraph>
          </Space>
          <div className="toolbar-actions">
            <Button onClick={handleRefresh} disabled={txBusy} size="large">
              刷新信息
            </Button>
          </div>
        </div>
      </Card>

      <Card className="surface-card" variant="borderless">
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={[16, 16]} className="metric-grid">
            <Col xs={24} sm={12} lg={8}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">钱包余额</Typography.Text>
                <Typography.Text className="metric-value">{balance || '0'} TOKEN</Typography.Text>
                <Typography.Text className="metric-meta">当前连接钱包的可用代币数量</Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">总供应量</Typography.Text>
                <Typography.Text className="metric-value">{totalSupply || '-'}</Typography.Text>
                <Typography.Text className="metric-meta">链上当前已发行的总代币数量</Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">已授权质押额度</Typography.Text>
                <Typography.Text className="metric-value">{allowance || '0'}</Typography.Text>
                <Typography.Text className="metric-meta">当前钱包授权给质押池使用的额度</Typography.Text>
              </Card>
            </Col>
          </Row>

          <Descriptions bordered column={1} className="summary-descriptions">
            <Descriptions.Item label="代币合约地址">{MYTOKENV2_ADDRESS}</Descriptions.Item>
            <Descriptions.Item label="代币所有者">{tokenOwner || '-'}</Descriptions.Item>
            <Descriptions.Item label="当前钱包">{address}</Descriptions.Item>
            <Descriptions.Item label="质押池地址">{STAKING_POOL_ADDRESS}</Descriptions.Item>
          </Descriptions>

          <Alert
            type={isOwner ? 'success' : 'warning'}
            title={isOwner ? '当前钱包拥有管理员权限' : '当前钱包为普通用户'}
            description={
              isOwner
                ? '你可以执行铸造与转账操作，并管理代币初始流转。'
                : '当前钱包可执行授权操作；如需铸造或发放代币，请切换到代币所有者钱包。'
            }
            showIcon
          />
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className="section-card" variant="borderless" title="管理员操作">
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Typography.Title level={5} className="section-title">
                  铸造
                </Typography.Title>
                <Typography.Text className="section-note">
                  为代币所有者账户追加新的 Token 供应量。
                </Typography.Text>
                <div className="form-row">
                  <Input
                    style={{ width: 300 }}
                    placeholder="输入铸造数量"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    disabled={!isOwner || txBusy}
                  />
                  <Button
                    type="primary"
                    loading={loading}
                    onClick={handleMint}
                    disabled={!isOwner || txBusy}
                  >
                    铸造
                  </Button>
                </div>
              </Space>

              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Typography.Title level={5} className="section-title">
                  转账
                </Typography.Title>
                <Typography.Text className="section-note">
                  从当前管理员钱包向指定地址发放 Token。
                </Typography.Text>
                <div className="form-row">
                  <Input
                    style={{ width: 400 }}
                    placeholder="输入接收地址"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    disabled={!isOwner || txBusy}
                  />
                  <Input
                    style={{ width: 200 }}
                    placeholder="输入转账数量"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    disabled={!isOwner || txBusy}
                  />
                  <Button loading={loading} onClick={handleTransfer} disabled={!isOwner || txBusy}>
                    转账
                  </Button>
                </div>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="section-card" variant="borderless" title="用户操作">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Title level={5} className="section-title">
                授权
              </Typography.Title>
              <Typography.Text className="section-note">
                为质押池授予代币使用额度，完成后即可在质押页面直接发起质押。
              </Typography.Text>
              <div className="form-row">
                <Input
                  style={{ width: 300 }}
                  placeholder="输入授权数量"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  disabled={txBusy}
                />
                <Button type="primary" loading={loading} onClick={handleApprove} disabled={txBusy}>
                  授权
                </Button>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default TokenPage;
