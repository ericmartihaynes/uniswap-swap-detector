import {
  BlockEvent,
  Finding,
  HandleBlock,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  ethers,
} from "forta-agent";

export const SWAP_EVENT = "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)";
export const UNISWAP_V3_FACTORY_ADDRESS = "0x1f98431c8ad98523631ae4a59f267346ea31f984";


const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent
) => {
  const findings: Finding[] = [];

  // filter the transaction logs for swap events
  const swapEvents = txEvent.filterLog(
    SWAP_EVENT
  );
  
  if(swapEvents.length > 0){
    
    //get possible pool address and get token and fee information
    const possiblePoolAddress = Object.keys(txEvent.addresses).pop()!.toLocaleLowerCase();
    const provider = ethers.getDefaultProvider();
    const poolContract = new ethers.Contract(possiblePoolAddress, [
      'function token0() public view returns (address)',
      'function token1() public view returns (address)',
      'function fee() public view returns (uint24)'
    ], provider);

    let token0 = "0x0000000000000000000000000000000000000000";
    let token1 = "0x0000000000000000000000000000000000000000";
    let fee = "0";
    try{
      token0 = await poolContract.token0();
      token1 = await poolContract.token1();
      fee = await poolContract.fee();
    } catch(e){}

    //query the factory contract to confirm the pool exists
    const factoryContract = new ethers.Contract(UNISWAP_V3_FACTORY_ADDRESS, [
      'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)'
    ], provider);

    const pool = await factoryContract.getPool(token0 , token1, fee);

  swapEvents.forEach((swapEvent) => {
    // extract swap event arguments
    const { sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick } = swapEvent.args;
    

    // if a uniswap V3 swap is detected, report it
    if (pool != "0x0000000000000000000000000000000000000000") {
      findings.push(
        Finding.fromObject({
          name: "Uniswap V3 Swap",
          description: `Swap detected in pool: ${pool.toLowerCase()}`, 
          alertId: "UNISWAP-1",
          protocol: "uniswap v3",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            sender: sender.toLowerCase(),
            recipient: recipient.toLowerCase(),
            pool: pool.toLowerCase(),
            token0: token0.toLowerCase(),
            token1: token1.toLowerCase(),
            fee: fee.toString(),
          },
        })
      );
      
    }
  });
}

  return findings;
};

// const handleBlock: HandleBlock = async (blockEvent: BlockEvent) => {
//   const findings: Finding[] = [];
//   // detect some block condition
//   return findings;
// }

export default {
  handleTransaction,
  // handleBlock
};
