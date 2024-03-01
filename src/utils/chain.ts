import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { chains } from 'chain-registry'

export const getCosmWasmClientForChain = async (
  chainId: string
): Promise<CosmWasmClient> => {
  const chain = chains.find((chain) => chain.chain_id === chainId)
  const rpcs = (
    chain
      ? [
          `https://rpc.cosmos.directory/${chain.chain_name}`,
          ...(chain.apis?.rpc?.map(({ address }) => address) || []),
        ]
      : []
  ).filter((rpc): rpc is string => !!rpc)
  if (!rpcs.length) {
    throw new Error(`No RPC for chain ${chainId}`)
  }

  for (const rpc of rpcs) {
    try {
      return await CosmWasmClient.connect(rpc)
    } catch (err) {
      console.error(err)
    }
  }

  throw new Error(
    `No RPC for chain ${chainId} (tried ${rpcs.length.toLocaleString()})`
  )
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
