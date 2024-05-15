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

export const getWalletVotingPowerAtBlockHeight = async (
  chainId: string,
  daoAddress: string,
  walletAddress: string,
  blockHeight?: number
): Promise<string> => {
  const client = await getCosmWasmClientForChain(chainId)

  return (
    await client.queryContractSmart(daoAddress, {
      voting_power_at_height: {
        address: walletAddress,
        height: blockHeight,
      },
    })
  ).power
}

// If address has voting power, it's a member of the DAO at the given block
// height.
export const isWalletMemberOfDaoAtBlockHeight = async (
  ...args: Parameters<typeof getWalletVotingPowerAtBlockHeight>
): Promise<boolean> =>
  BigInt(await getWalletVotingPowerAtBlockHeight(...args)) > 0n
