import { createConfig, http, injected } from 'wagmi';
import { hardhat, mainnet, sepolia } from 'wagmi/chains';

export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia, mainnet],
  connectors: [injected()],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
    [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
