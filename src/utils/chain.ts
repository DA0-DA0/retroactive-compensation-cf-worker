import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'

export const RPC_FOR_CHAIN_ID: Record<string, string | undefined> = {
  'juno-1': 'https://juno-rpc.reece.sh:443',
  'uni-6': 'https://rpc.uni.junonetwork.io:443',
  'osmosis-1': 'https://rpc.osmosis.zone:443',
  'osmo-test-5': 'https://rpc.testnet.osmosis.zone:443',
  'stargaze-1': 'https://rpc.stargaze-apis.com',
  'elgafar-1': 'https://rpc.elgafar-1.stargaze-apis.com',
  'neutron-1': 'https://rpc-kralum.neutron-1.neutron.org',
  'migaloo-1': 'https://migaloo-rpc.polkachu.com',
  'narwhal-2': 'https://migaloo-testnet-rpc.polkachu.com',
}

export const getCosmWasmClientForChain = async (
  chainId: string
): Promise<CosmWasmClient> => {
  const rpc = RPC_FOR_CHAIN_ID[chainId]
  if (!rpc) {
    throw new Error(`No RPC for chain ${chainId}`)
  }
  return CosmWasmClient.connect(rpc)
}

export const isWalletMemberOfDaoAtBlockHeight = async (
  chainId: string,
  daoAddress: string,
  walletAddress: string,
  blockHeight?: number
): Promise<boolean> => {
  const client = await getCosmWasmClientForChain(chainId)

  const votingPower = (
    await client.queryContractSmart(daoAddress, {
      voting_power_at_height: {
        address: walletAddress,
        height: blockHeight,
      },
    })
  ).power

  // If voting power is 0, the address is not a member of the DAO at the given
  // block height.
  return votingPower !== '0'
}
