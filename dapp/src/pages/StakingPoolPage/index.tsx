import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Space, Typography, Input, Button, message, Table, Row, Col } from 'antd';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { useStakingPool } from '@/hooks/useStakingPool';
import { humanizeEthersError } from '@/common/humanizeEthersError';
import { STAKING_POOL_ADDRESS } from '@/config';
import stakingPoolABI from '@/abis/StakingPool.json';

const StakingPoolPage = () => {
  const { provider, address, signer, connectWallet } = useWallet();
  const {
    loadTokenDecimals,
    loadTotalStaked,
    loadTotalStakedRaw,
    loadUserStaked,
    loadUserEarned,
    loadUserEarnedRaw,
    loadAllowance,
    loadAllowanceRaw,
    approve,
    stake,
    unstake,
    harvest,
    loadTokenOwner,
    loadPoolOwner,
    loadPoolTokenBalanceRaw,
    tryLoadRewardFundRaw,
    injectReward,
    rewardTransfer,
    distributeOnly,
    distributeOnlyRaw,
    fundAndDistribute,
    distributeReward,
  } = useStakingPool(provider);

  const [tokenDecimals, setTokenDecimals] = useState(18);

  const [totalStaked, setTotalStaked] = useState('');
  const [userStaked, setUserStaked] = useState('');
  const [earned, setEarned] = useState('');
  const [allowance, setAllowance] = useState('');
  const [allowanceRaw, setAllowanceRaw] = useState<bigint>(0n);
  const [poolOwner, setPoolOwner] = useState('');
  const [tokenOwner, setTokenOwner] = useState('');
  const [poolTotalTokenBalance, setPoolTotalTokenBalance] = useState('');
  const [unallocatedRewardBalance, setUnallocatedRewardBalance] = useState('');
  const [rewardFundBalance, setRewardFundBalance] = useState('');
  const [unallocatedRewardRaw, setUnallocatedRewardRaw] = useState<bigint>(0n);
  const [rewardFundSupported, setRewardFundSupported] = useState(false);

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [injectAmount, setInjectAmount] = useState('');
  const [rewardTo, setRewardTo] = useState('');
  const [rewardPayAmount, setRewardPayAmount] = useState('');
  const [fundAmount, setFundAmount] = useState('');

  const [infoLoading, setInfoLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [stakeLoading, setStakeLoading] = useState(false);
  const [unstakeLoading, setUnstakeLoading] = useState(false);
  const [harvestLoading, setHarvestLoading] = useState(false);
  const [distributeLoading, setDistributeLoading] = useState(false);
  const [rewardPayLoading, setRewardPayLoading] = useState(false);
  const [injectLoading, setInjectLoading] = useState(false);
  const [fundLoading, setFundLoading] = useState(false);

  const [stakersLoading, setStakersLoading] = useState(false);
  const [stakerRows, setStakerRows] = useState<
    Array<{
      key: string;
      address: string;
      staked: string;
      claimable: string;
      claimed: string;
      totalRewards: string;
    }>
  >([]);

  const txBusy =
    approveLoading ||
    stakeLoading ||
    unstakeLoading ||
    harvestLoading ||
    distributeLoading ||
    rewardPayLoading ||
    injectLoading ||
    fundLoading;
  const isPoolOwner =
    poolOwner && address ? poolOwner.toLowerCase() === address.toLowerCase() : false;
  const isTokenOwner =
    tokenOwner && address ? tokenOwner.toLowerCase() === address.toLowerCase() : false;

  const infoRequestIdRef = useRef(0);
  const stakersRequestIdRef = useRef(0);
  const warnedRewardFundUnsupportedRef = useRef(false);

  const refreshStakers = useCallback(async (): Promise<boolean> => {
    if (!provider) return false;

    const requestId = ++stakersRequestIdRef.current;
    try {
      setStakersLoading(true);

      const iface = new ethers.Interface(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (stakingPoolABI as any).abi,
      );
      const stakedTopic = iface.getEvent('Staked')!.topicHash;
      const rewardPaidTopic = iface.getEvent('RewardPaid')!.topicHash;

      const [stakedLogs, rewardPaidLogs] = await Promise.all([
        provider.getLogs({
          address: STAKING_POOL_ADDRESS,
          fromBlock: 0,
          toBlock: 'latest',
          topics: [stakedTopic],
        }),
        provider.getLogs({
          address: STAKING_POOL_ADDRESS,
          fromBlock: 0,
          toBlock: 'latest',
          topics: [rewardPaidTopic],
        }),
      ]);

      const addressSet = new Set<string>();
      for (const log of stakedLogs) {
        const parsed = iface.parseLog(log)!;
        addressSet.add((parsed.args as any).user);
      }

      const claimedBy = new Map<string, bigint>();
      for (const log of rewardPaidLogs) {
        const parsed = iface.parseLog(log)!;
        const user = (parsed.args as any).user as string;
        const reward = BigInt(((parsed.args as any).reward as any).toString());
        addressSet.add(user);
        claimedBy.set(user, (claimedBy.get(user) ?? 0n) + reward);
      }

      const addresses = Array.from(addressSet);
      const pool = new ethers.Contract(
        STAKING_POOL_ADDRESS,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (stakingPoolABI as any).abi,
        provider,
      );

      const snapshots = await Promise.all(
        addresses.map(async (addr) => {
          const [stakedRaw, earnedRaw] = await Promise.all([
            pool.balances(addr),
            pool.earned(addr),
          ]);
          const stakedBn = BigInt(stakedRaw.toString());
          const earnedBn = BigInt(earnedRaw.toString());
          const claimedBn = claimedBy.get(addr) ?? 0n;
          return { addr, stakedBn, earnedBn, claimedBn };
        }),
      );

      const active = snapshots
        .filter((x) => x.stakedBn > 0n || x.earnedBn > 0n || x.claimedBn > 0n)
        .sort((a, b) => {
          if (a.stakedBn === b.stakedBn) return a.addr.localeCompare(b.addr);
          return a.stakedBn > b.stakedBn ? -1 : 1;
        });

      if (stakersRequestIdRef.current !== requestId) return false;

      setStakerRows(
        active.map((x) => {
          const total = x.claimedBn + x.earnedBn;
          return {
            key: x.addr,
            address: x.addr,
            staked: ethers.formatUnits(x.stakedBn, tokenDecimals),
            claimable: ethers.formatUnits(x.earnedBn, tokenDecimals),
            claimed: ethers.formatUnits(x.claimedBn, tokenDecimals),
            totalRewards: ethers.formatUnits(total, tokenDecimals),
          };
        }),
      );

      return true;
    } catch (e: any) {
      if (stakersRequestIdRef.current !== requestId) return false;
      message.error(humanizeEthersError(e));
      return false;
    } finally {
      if (stakersRequestIdRef.current === requestId) {
        setStakersLoading(false);
      }
    }
  }, [provider, tokenDecimals]);

  const refreshInfo = useCallback(async (): Promise<boolean> => {
    if (!address) return false;

    const requestId = ++infoRequestIdRef.current;
    try {
      setInfoLoading(true);
      const [total, staked, reward, a, aRaw] = await Promise.all([
        loadTotalStaked(),
        loadUserStaked(address),
        loadUserEarned(address),
        loadAllowance(address),
        loadAllowanceRaw(address),
      ]);
      const [poolO, tokenO, poolBalRaw, totalRaw, rewardFundRawOrNull] = await Promise.all([
        loadPoolOwner(),
        loadTokenOwner(),
        loadPoolTokenBalanceRaw(),
        loadTotalStakedRaw(),
        tryLoadRewardFundRaw(),
      ]);
      if (infoRequestIdRef.current !== requestId) return false;
      setTotalStaked(total);
      setUserStaked(staked);
      setEarned(reward);
      setAllowance(a);
      setAllowanceRaw(aRaw);
      setPoolOwner(poolO);
      setTokenOwner(tokenO);
      setPoolTotalTokenBalance(ethers.formatUnits(poolBalRaw, tokenDecimals));
      if (rewardFundRawOrNull === null) {
        if (!warnedRewardFundUnsupportedRef.current) {
          warnedRewardFundUnsupportedRef.current = true;
          message.warning('当前质押池合约未升级：无法读取 rewardFund（请重新部署并更新前端地址）');
        }
        const unallocatedRaw = poolBalRaw > totalRaw ? poolBalRaw - totalRaw : 0n;
        setUnallocatedRewardBalance(ethers.formatUnits(unallocatedRaw, tokenDecimals));
        setUnallocatedRewardRaw(unallocatedRaw);
        setRewardFundSupported(false);
        setRewardFundBalance('-');
      } else {
        const unallocatedRaw =
          poolBalRaw > totalRaw + rewardFundRawOrNull
            ? poolBalRaw - totalRaw - rewardFundRawOrNull
            : 0n;
        setUnallocatedRewardBalance(ethers.formatUnits(unallocatedRaw, tokenDecimals));
        setUnallocatedRewardRaw(unallocatedRaw);
        setRewardFundSupported(true);
        setRewardFundBalance(ethers.formatUnits(rewardFundRawOrNull, tokenDecimals));
      }
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
  }, [
    address,
    loadAllowance,
    loadAllowanceRaw,
    loadPoolOwner,
    loadPoolTokenBalanceRaw,
    tryLoadRewardFundRaw,
    loadTokenOwner,
    loadTotalStaked,
    loadTotalStakedRaw,
    loadUserEarned,
    loadUserStaked,
    tokenDecimals,
  ]);

  const refreshAll = useCallback(async (): Promise<boolean> => {
    const [infoOk, stakersOk] = await Promise.all([refreshInfo(), refreshStakers()]);
    return infoOk && stakersOk;
  }, [refreshInfo, refreshStakers]);

  const handleRefresh = async () => {
    const ok = await refreshAll();
    if (ok) message.success('质押信息已刷新');
  };

  useEffect(() => {
    if (!provider) {
      return;
    }
    const run = async () => {
      try {
        const d = await loadTokenDecimals();
        setTokenDecimals(d);
      } catch {
        setTokenDecimals(18);
      }
    };
    void run();
  }, [loadTokenDecimals, provider]);

  useEffect(() => {
    if (!provider || !address) {
      return;
    }
    void refreshAll();
  }, [address, provider, refreshAll]);

  const needApprove = useMemo(() => {
    if (!stakeAmount) {
      return false;
    }
    try {
      const parsed = ethers.parseUnits(stakeAmount, tokenDecimals);
      return parsed > allowanceRaw;
    } catch {
      return false;
    }
  }, [stakeAmount, tokenDecimals, allowanceRaw]);

  const handleApprove = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!stakeAmount) {
        message.warning('请输入质押数量');
        return;
      }
      setApproveLoading(true);
      await approve(stakeAmount, signer);
      message.success('授权成功');
      await refreshAll();
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setApproveLoading(false);
    }
  };

  const handleStake = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!stakeAmount) {
        message.warning('请输入质押数量');
        return;
      }
      setStakeLoading(true);
      await stake(stakeAmount, signer);
      message.success('质押成功');
      setStakeAmount('');
      await refreshAll();
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setStakeLoading(false);
    }
  };

  const handleUnstake = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!unstakeAmount) {
        message.warning('请输入解除质押数量');
        return;
      }
      setUnstakeLoading(true);
      await unstake(unstakeAmount, signer);
      message.success('解除质押成功');
      setUnstakeAmount('');
      await refreshAll();
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setUnstakeLoading(false);
    }
  };

  const handleHarvest = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      const earnedNow = await loadUserEarnedRaw(address);
      if (earnedNow <= 0n) {
        message.warning('当前钱包地址没有可领取奖励（请确认你连接的钱包地址）');
        return;
      }
      setHarvestLoading(true);
      await harvest(signer);
      message.success('领取奖励成功');
      await refreshAll();
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setHarvestLoading(false);
    }
  };

  const handleDistribute = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!isPoolOwner) {
        message.warning('只有池子 Owner 才能派发奖励');
        return;
      }
      if (!rewardAmount) {
        message.warning('请输入派发奖励数量');
        return;
      }
      setDistributeLoading(true);
      await distributeReward(rewardAmount, signer);
      message.success('派发奖励成功');
      setRewardAmount('');
      await refreshAll();
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setDistributeLoading(false);
    }
  };

  const handleFundAndDistribute = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!isPoolOwner) {
        message.warning('只有池子 Owner 才能派发奖励');
        return;
      }
      if (!fundAmount) {
        message.warning('请输入派发奖励数量');
        return;
      }
      setFundLoading(true);
      await fundAndDistribute(fundAmount, signer);
      message.success('派发奖励成功（fundAndDistribute）');
      setFundAmount('');
      await refreshAll();
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setFundLoading(false);
    }
  };

  const handleInject = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!isPoolOwner) {
        message.warning('只有池子 Owner 才能注入奖励');
        return;
      }
      if (!injectAmount) {
        message.warning('请输入注入奖励数量');
        return;
      }
      setInjectLoading(true);
      await injectReward(injectAmount, signer);
      message.success('奖励已注入质押池');
      setInjectAmount('');
      await refreshAll();
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setInjectLoading(false);
    }
  };

  const handleDistributeOnly = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!isPoolOwner) {
        message.warning('只有池子 Owner 才能派发奖励');
        return;
      }
      if (!rewardAmount) {
        message.warning('请输入派发奖励数量');
        return;
      }
      setDistributeLoading(true);
      await distributeOnly(rewardAmount, signer);
      message.success('派发奖励成功（使用已注入资金）');
      setRewardAmount('');
      await refreshAll();
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setDistributeLoading(false);
    }
  };

  const handleDistributeAllUnallocated = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!isPoolOwner) {
        message.warning('只有池子 Owner 才能派发奖励');
        return;
      }
      if (!rewardFundSupported) {
        message.warning('当前质押池合约未升级：请重新部署后再使用“派发未分配奖励”');
        return;
      }
      if (unallocatedRewardRaw <= 0n) {
        message.warning('当前没有未分配奖励');
        return;
      }
      setDistributeLoading(true);
      await distributeOnlyRaw(unallocatedRewardRaw, signer);
      message.success('派发成功（全部未分配奖励）');
      await refreshAll();
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setDistributeLoading(false);
    }
  };

  const handleRewardPay = async () => {
    try {
      if (!provider || !address || !signer) {
        message.warning('请先连接钱包');
        return;
      }
      if (!isTokenOwner) {
        message.warning('只有代币部署者（Token Owner）才能发放奖励');
        return;
      }
      const to = (rewardTo || address).trim();
      if (!ethers.isAddress(to)) {
        message.warning('请输入正确的接收地址');
        return;
      }
      if (!rewardPayAmount) {
        message.warning('请输入发放奖励数量');
        return;
      }
      setRewardPayLoading(true);
      await rewardTransfer(to, rewardPayAmount, signer);
      message.success('奖励发放成功（直接转账）');
      setRewardPayAmount('');
      setRewardTo('');
    } catch (e: any) {
      message.error(humanizeEthersError(e));
    } finally {
      setRewardPayLoading(false);
    }
  };

  if (!address) {
    return (
      <Space orientation="vertical" size="large" className="page-stack">
        <Card className="hero-card" variant="borderless">
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div className="toolbar-row">
              <Space orientation="vertical" size="small">
                <Typography.Title level={2} className="page-title">
                  质押
                </Typography.Title>
                <Typography.Paragraph className="page-subtitle">
                  请先连接钱包后再进行质押、解除质押或领取奖励。连接后你可以查看质押池余额、奖励状态与质押用户列表。
                </Typography.Paragraph>
              </Space>
              <div className="toolbar-actions">
                <Button type="primary" size="large" onClick={connectWallet}>
                  连接钱包
                </Button>
              </div>
            </div>

            <Row gutter={[16, 16]} className="metric-grid">
              <Col xs={24} sm={12} lg={6}>
                <Card className="metric-card" variant="borderless">
                  <Typography.Text className="metric-label">质押池余额</Typography.Text>
                  <Typography.Text className="metric-value">-</Typography.Text>
                  <Typography.Text className="metric-meta">连接钱包后读取池子总代币余额</Typography.Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card className="metric-card" variant="borderless">
                  <Typography.Text className="metric-label">总质押量</Typography.Text>
                  <Typography.Text className="metric-value">-</Typography.Text>
                  <Typography.Text className="metric-meta">连接钱包后读取全池质押总量</Typography.Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card className="metric-card" variant="borderless">
                  <Typography.Text className="metric-label">已分配奖励</Typography.Text>
                  <Typography.Text className="metric-value">-</Typography.Text>
                  <Typography.Text className="metric-meta">已派发但尚未领取的奖励</Typography.Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card className="metric-card" variant="borderless">
                  <Typography.Text className="metric-label">待分配奖励</Typography.Text>
                  <Typography.Text className="metric-value">-</Typography.Text>
                  <Typography.Text className="metric-meta">已注入但尚未派发的奖励</Typography.Text>
                </Card>
              </Col>
            </Row>
          </Space>
        </Card>

        <Card className="section-card" variant="borderless" title="奖励派发">
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text className="section-note">连接钱包后可执行奖励派发与注入操作。</Typography.Text>
            <div className="form-row">
              <Input placeholder="输入派发奖励数量" style={{ width: 240 }} disabled />
              <Button type="primary" size="large" disabled>
                派发奖励
              </Button>
            </div>
          </Space>
        </Card>

        <Card className="section-card" variant="borderless" title="质押操作">
          <Row gutter={[16, 16]} className="page-actions-grid">
            <Col xs={24} lg={8}>
              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Typography.Title level={5} className="section-title">
                  质押
                </Typography.Title>
                <Input placeholder="输入要质押的数量" style={{ width: 240 }} disabled />
                <Button type="primary" size="large" disabled>
                  立即质押
                </Button>
              </Space>
            </Col>
            <Col xs={24} lg={8}>
              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Typography.Title level={5} className="section-title">
                  解除质押
                </Typography.Title>
                <Input placeholder="输入要解除的质押数量" style={{ width: 240 }} disabled />
                <Button danger type="primary" size="large" disabled>
                  解除质押
                </Button>
              </Space>
            </Col>
            <Col xs={24} lg={8}>
              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Typography.Title level={5} className="section-title">
                  领取奖励
                </Typography.Title>
                <Button type="primary" size="large" disabled>
                  领取奖励
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Card className="section-card" variant="borderless" title="质押用户表格">
          <Table
            className="arcfi-table"
            size="middle"
            dataSource={[]}
            pagination={false}
            columns={[
              { title: '地址', dataIndex: 'address', key: 'address' },
              { title: '质押数量', dataIndex: 'staked', key: 'staked' },
              { title: '待领取', dataIndex: 'claimable', key: 'claimable' },
              { title: '已领取', dataIndex: 'claimed', key: 'claimed' },
              { title: '累计奖励', dataIndex: 'totalRewards', key: 'totalRewards' },
            ]}
          />
        </Card>
      </Space>
    );
  }

  return (
    <Space orientation="vertical" size="large" className="page-stack">
      <Card className="hero-card" variant="borderless">
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <div className="toolbar-row">
            <Space orientation="vertical" size="small">
              <Typography.Title level={2} className="page-title">
                质押
              </Typography.Title>
              <Typography.Paragraph className="page-subtitle">
                统一查看质押池余额、奖励状态与质押用户明细，并管理奖励注入、派发与领取流程。
              </Typography.Paragraph>
            </Space>
            <div className="toolbar-actions">
              <Button
                type="default"
                size="large"
                loading={
                  infoLoading ||
                  approveLoading ||
                  stakeLoading ||
                  unstakeLoading ||
                  harvestLoading ||
                  distributeLoading ||
                  rewardPayLoading ||
                  injectLoading ||
                  fundLoading ||
                  stakersLoading
                }
                disabled={infoLoading || txBusy}
                onClick={handleRefresh}
              >
                刷新信息
              </Button>
            </div>
          </div>

          <Row gutter={[16, 16]} className="metric-grid">
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">质押池余额</Typography.Text>
                <Typography.Text className="metric-value">
                  {poolTotalTokenBalance ? `${poolTotalTokenBalance} TOKEN` : '0 TOKEN'}
                </Typography.Text>
                <Typography.Text className="metric-meta">
                  包含质押本金、待分配奖励与已分配未领取奖励
                </Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">总质押量</Typography.Text>
                <Typography.Text className="metric-value">
                  {totalStaked ? `${totalStaked} TOKEN` : '-'}
                </Typography.Text>
                <Typography.Text className="metric-meta">所有用户当前在池中的质押总额</Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">已分配奖励</Typography.Text>
                <Typography.Text className="metric-value">
                  {rewardFundBalance ? `${rewardFundBalance} TOKEN` : '0 TOKEN'}
                </Typography.Text>
                <Typography.Text className="metric-meta">已完成派发但尚未被用户领取的奖励</Typography.Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="metric-card" variant="borderless">
                <Typography.Text className="metric-label">待分配奖励</Typography.Text>
                <Typography.Text className="metric-value">
                  {unallocatedRewardBalance ? `${unallocatedRewardBalance} TOKEN` : '0 TOKEN'}
                </Typography.Text>
                <Typography.Text className="metric-meta">已注入池中但尚未执行奖励派发的 Token</Typography.Text>
              </Card>
            </Col>
          </Row>

          <Typography.Text className="section-note">
            质押池余额由质押本金、待分配奖励和已分配未领取奖励构成；只有在完成派发后，用户的可领取奖励才会更新。
          </Typography.Text>
        </Space>
      </Card>

      <Card className="section-card" variant="borderless" title="我的质押状态">
        <Row gutter={[16, 16]} className="metric-grid">
          <Col xs={24} sm={8}>
            <Card className="metric-card" variant="borderless">
              <Typography.Text className="metric-label">我的质押</Typography.Text>
              <Typography.Text className="metric-value">{userStaked || '0'} TOKEN</Typography.Text>
              <Typography.Text className="metric-meta">当前钱包已质押到池中的 Token 数量</Typography.Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="metric-card" variant="borderless">
              <Typography.Text className="metric-label">当前可领取奖励</Typography.Text>
              <Typography.Text className="metric-value">{earned || '0'} TOKEN</Typography.Text>
              <Typography.Text className="metric-meta">完成派发后可由当前钱包领取的奖励</Typography.Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="metric-card" variant="borderless">
              <Typography.Text className="metric-label">已授权质押额度</Typography.Text>
              <Typography.Text className="metric-value">{allowance || '0'} TOKEN</Typography.Text>
              <Typography.Text className="metric-meta">当前钱包已授权给质押池的可用额度</Typography.Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {isPoolOwner && (
        <Card className="section-card" variant="borderless" title="奖励派发">
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text className="section-note">
              使用单入口奖励流程，可在一笔交易中将奖励从管理员钱包转入质押池并完成派发记账。执行前需要先完成授权。
            </Typography.Text>
            <div className="form-row">
              <Input
                placeholder="输入派发奖励数量"
                style={{ width: 240 }}
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                disabled={infoLoading || txBusy}
              />
              <Button
                type="primary"
                size="large"
                loading={fundLoading}
                disabled={infoLoading || txBusy}
                onClick={handleFundAndDistribute}
              >
                派发奖励
              </Button>
            </div>
          </Space>
        </Card>
      )}

      <Card className="section-card" variant="borderless" title="质押用户表格">
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Table
            className="arcfi-table"
            size="middle"
            loading={stakersLoading}
            dataSource={stakerRows}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            columns={[
              {
                title: '地址',
                dataIndex: 'address',
                key: 'address',
                render: (v: string) => (
                  <Typography.Text code copyable className="code-address">
                    {v}
                  </Typography.Text>
                ),
              },
              { title: '质押数量', dataIndex: 'staked', key: 'staked', render: (v: string) => `${v} TOKEN` },
              {
                title: '待领取',
                dataIndex: 'claimable',
                key: 'claimable',
                render: (v: string) => `${v} TOKEN`,
              },
              { title: '已领取', dataIndex: 'claimed', key: 'claimed', render: (v: string) => `${v} TOKEN` },
              {
                title: '累计奖励',
                dataIndex: 'totalRewards',
                key: 'totalRewards',
                render: (v: string) => `${v} TOKEN`,
              },
            ]}
          />
          <Typography.Text className="section-note">
            地址列表通过质押与奖励事件汇总得出，“已领取”来自 RewardPaid 事件累计，“待领取”为当前链上可领取奖励。
          </Typography.Text>
        </Space>
      </Card>

      {isPoolOwner && (
        <Card className="section-card" variant="borderless" title="奖励注入">
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text className="section-note">
              先将奖励 Token 注入质押池，再根据需要发起统一派发。注入操作不会立即改变用户可领取奖励。
            </Typography.Text>
            <div className="form-row">
              <Input
                placeholder="输入注入奖励数量"
                style={{ width: 240 }}
                value={injectAmount}
                onChange={(e) => setInjectAmount(e.target.value)}
                disabled={infoLoading || txBusy}
              />
              <Button
                type="primary"
                size="large"
                loading={injectLoading}
                disabled={infoLoading || txBusy}
                onClick={handleInject}
              >
                注入奖励
              </Button>
              <Button
                type="default"
                size="large"
                loading={distributeLoading}
                disabled={infoLoading || txBusy || !rewardFundSupported || unallocatedRewardRaw <= 0n}
                onClick={handleDistributeAllUnallocated}
              >
                派发待分配奖励
              </Button>
            </div>
            <Typography.Text className="section-note">
              注入只会增加待分配奖励；完成派发后，奖励才会进入用户可领取状态。
            </Typography.Text>
          </Space>
        </Card>
      )}

      {isTokenOwner && (
        <Card className="section-card" variant="borderless" title="直接转账发放">
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text className="section-note">
              从代币所有者钱包直接向目标地址转账奖励，不经过质押池的奖励记账逻辑。
            </Typography.Text>
            <div className="form-row">
              <Input
                placeholder="输入接收地址（默认当前钱包）"
                style={{ width: 420 }}
                value={rewardTo}
                onChange={(e) => setRewardTo(e.target.value)}
                disabled={infoLoading || txBusy}
              />
              <Input
                placeholder="输入奖励数量"
                style={{ width: 220 }}
                value={rewardPayAmount}
                onChange={(e) => setRewardPayAmount(e.target.value)}
                disabled={infoLoading || txBusy}
              />
              <Button
                type="primary"
                size="large"
                loading={rewardPayLoading}
                disabled={infoLoading || txBusy}
                onClick={handleRewardPay}
              >
                直接转账
              </Button>
            </div>
          </Space>
        </Card>
      )}

      {isPoolOwner && (
        <Card className="section-card" variant="borderless" title="高级派发选项">
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text className="section-note">
              可选流程：先注入再单独派发，或按照两笔交易执行“转账并派发”，适合演示奖励流转细节。
            </Typography.Text>
            <div className="form-row">
              <Input
                placeholder="输入派发奖励数量"
                style={{ width: 240 }}
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                disabled={infoLoading || txBusy}
              />
              <Button
                type="default"
                size="large"
                loading={distributeLoading}
                disabled={infoLoading || txBusy}
                onClick={handleDistributeOnly}
              >
                仅派发
              </Button>
              <Button
                type="primary"
                size="large"
                loading={distributeLoading}
                disabled={infoLoading || txBusy}
                onClick={handleDistribute}
              >
                转账并派发
              </Button>
            </div>
          </Space>
        </Card>
      )}

      <Card className="section-card" variant="borderless" title="质押操作">
        <Row gutter={[16, 16]} className="page-actions-grid">
          <Col xs={24} lg={8}>
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Title level={5} className="section-title">
                质押
              </Typography.Title>
              <Typography.Text className="section-note">
                输入要质押的 Token 数量，授权不足时可直接先完成授权。
              </Typography.Text>
              <div className="form-row">
                <Input
                  placeholder="输入要质押的数量"
                  style={{ width: 240 }}
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  disabled={infoLoading || txBusy}
                />
                {needApprove ? (
                  <Button
                    type="primary"
                    size="large"
                    loading={approveLoading}
                    disabled={infoLoading || txBusy}
                    onClick={handleApprove}
                  >
                    先授权
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    loading={stakeLoading}
                    disabled={infoLoading || txBusy}
                    onClick={handleStake}
                  >
                    立即质押
                  </Button>
                )}
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={8}>
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Title level={5} className="section-title">
                解除质押
              </Typography.Title>
              <Typography.Text className="section-note">
                解除指定数量的质押 Token，操作完成后会自动刷新池子与个人状态。
              </Typography.Text>
              <div className="form-row">
                <Input
                  placeholder="输入要解除的质押数量"
                  style={{ width: 240 }}
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  disabled={infoLoading || txBusy}
                />
                <Button
                  danger
                  type="primary"
                  size="large"
                  loading={unstakeLoading}
                  disabled={infoLoading || txBusy}
                  onClick={handleUnstake}
                >
                  解除质押
                </Button>
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={8}>
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Title level={5} className="section-title">
                领取奖励
              </Typography.Title>
              <Typography.Text className="section-note">
                领取当前钱包已完成派发且可提取的奖励 Token。
              </Typography.Text>
              <div className="form-row">
                <Button
                  type="primary"
                  size="large"
                  loading={harvestLoading}
                  disabled={infoLoading || txBusy}
                  onClick={handleHarvest}
                >
                  领取奖励
                </Button>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>
    </Space>
  );
};

export default StakingPoolPage;
