import {
  FindingType,
  FindingSeverity,
  Finding,
  HandleTransaction,
  TransactionEvent,
  getEthersProvider,
  ethers,
} from "forta-agent";

import {provideHandleTx} from "./agent";

import { TestTransactionEvent } from "forta-agent-tools/lib/tests";
import { createAddress, MockEthersProvider } from "forta-agent-tools/lib/tests";
import { encodeParameter } from "forta-agent-tools";
import { Interface } from "@ethersproject/abi";

const ABI: string[] = [
  "event Swap( address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick )",
];

const TEST_IFACE: Interface = new Interface([
  ...ABI,
  "event Swap( address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick )",
]);

const mockProvider: MockEthersProvider = new MockEthersProvider();

const ifaceToken0: ethers.utils.Interface =  new ethers.utils.Interface([
    'function token0() public view returns (address)',
    'function token1() public view returns (address)',
    'function fee() public view returns (uint24)'
]);
/*const ifaceToken1: ethers.utils.Interface =  new ethers.utils.Interface([
  "function token1() public view returns (address)"
]);
const ifaceFee: ethers.utils.Interface =  new ethers.utils.Interface([
  "function fee() public view returns (uint24)"
]);*/
const ifaceGetPool: ethers.utils.Interface =  new ethers.utils.Interface([
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)"
]);

const handler = provideHandleTx("0x1f98431c8ad98523631ae4a59f267346ea31f984", mockProvider as unknown as ethers.providers.Provider);


describe("Uniswap swap bot", () => {
  
 
  
  describe("handleTransaction", () => {

    const event = TEST_IFACE.getEvent("Swap");
      const log = TEST_IFACE.encodeEventLog(event, [
        createAddress("0xf0"),
        createAddress("0xf0"),
        50,
        50,
        50,
        50,
        50,
      ]);


    //Empty findings

    it("returns empty findings if there are no swap events from a non pool address", async () => {
      
      
      const transaction: TransactionEvent = new TestTransactionEvent().setFrom(createAddress("0x0")).setTo(createAddress("0x0"));
      const findings = await handler(transaction);

      expect(findings).toStrictEqual([]);
      
    });

    it("returns empty findings if there are no swap events from a pool address", async () => {
      
      
      const transaction: TransactionEvent = new TestTransactionEvent().setFrom(createAddress("0x0")).setTo(createAddress("0x0"))
      .addEventLog(event.format("sighash"), "0x4585fe77225b41b697c938b018e2ac67ac5a20c0");
      const findings = await handler(transaction);

      expect(findings).toStrictEqual([]);
      
    });

    /*it("returns empty findings if there are swap events from a non pool address", async () => {
      //recheck
      
      
      const transaction: TransactionEvent = new TestTransactionEvent().setFrom(createAddress("0x0")).setTo(createAddress("0x0"))
      .addEventLog(event.format("sighash"), createAddress("0x0"), log.data, ...log.topics.slice(1));
      const nonPoolHandler = provideHandleTx(createAddress("0x0"), getEthersProvider());
      const findings = await nonPoolHandler(transaction);

      expect(findings).toStrictEqual([]);
      
    });*/
    



    //Transaction found

    it("returns findings if there is a single Uniswap V3 swap from a valid pool", async () => {
      
      mockProvider.addCallTo(
        "0x4585fe77225b41b697c938b018e2ac67ac5a20c0", 1, ifaceToken0,
        "token0",
        { inputs:[], outputs:["0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"]},
      ).addCallTo(
        "0x4585fe77225b41b697c938b018e2ac67ac5a20c0", 1, ifaceToken0,
        "token1",
        { inputs:[], outputs:["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"]},
      ).addCallTo(
        "0x4585fe77225b41b697c938b018e2ac67ac5a20c0", 1, ifaceToken0,
        "fee",
        { inputs:[], outputs:[500]},
      ).addCallTo(
        "0x1f98431c8ad98523631ae4a59f267346ea31f984", 1, ifaceGetPool,
        "getPool",
        { inputs:["0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", 500], outputs:["0x4585fe77225b41b697c938b018e2ac67ac5a20c0"]},
      );
        
      const transaction: TransactionEvent = new TestTransactionEvent().setFrom(createAddress("0x0")).setTo(createAddress("0x0"))
      .addEventLog(event.format("sighash"), "0x4585fe77225b41b697c938b018e2ac67ac5a20c0", log.data, ...log.topics.slice(1));

      const findings = await handler(transaction);
      mockProvider.clear();
      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Uniswap V3 Swap",
          description: `Swap detected in pool: 0x4585fe77225b41b697c938b018e2ac67ac5a20c0`, 
          alertId: "UNISWAP-1",
          protocol: "uniswap v3",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            sender: createAddress("0xf0"),
            recipient: createAddress("0xf0"),
            pool: "0x4585fe77225b41b697c938b018e2ac67ac5a20c0",
            token0: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
            token1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            fee: "500",
          },
        }),
      ]);
      
    });

    /*it("returns findings if there are multiple Uniswap V3 swaps from the same pool", async () => {
      
      
      const transaction: TransactionEvent = new TestTransactionEvent().setFrom(createAddress("0x0")).setTo(createAddress("0x0"))
      .addEventLog(event.format("sighash"), "0x4585fe77225b41b697c938b018e2ac67ac5a20c0", log.data, ...log.topics.slice(1))
      .addEventLog(event.format("sighash"), "0x4585fe77225b41b697c938b018e2ac67ac5a20c0", log.data, ...log.topics.slice(1));

      const findings = await handler(transaction);

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Uniswap V3 Swap",
          description: `Swap detected in pool: 0x4585fe77225b41b697c938b018e2ac67ac5a20c0`, 
          alertId: "UNISWAP-1",
          protocol: "uniswap v3",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            sender: createAddress("0xf0"),
            recipient: createAddress("0xf0"),
            pool: "0x4585fe77225b41b697c938b018e2ac67ac5a20c0",
            token0: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
            token1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            fee: "500",
          },
        }),
        Finding.fromObject({
          name: "Uniswap V3 Swap",
          description: `Swap detected in pool: 0x4585fe77225b41b697c938b018e2ac67ac5a20c0`, 
          alertId: "UNISWAP-1",
          protocol: "uniswap v3",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            sender: createAddress("0xf0"),
            recipient: createAddress("0xf0"),
            pool: "0x4585fe77225b41b697c938b018e2ac67ac5a20c0",
            token0: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
            token1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            fee: "500",
          },
        }),
      ]);
      
    });*/

    /*it("returns findings if there are multiple Uniswap V3 swaps from the different pools", async () => {
      
      
      const transaction: TransactionEvent = new TestTransactionEvent().setFrom(createAddress("0x0")).setTo(createAddress("0x0"))
      .addEventLog(event.format("sighash"), "0x4585fe77225b41b697c938b018e2ac67ac5a20c0", log.data, ...log.topics.slice(1))
      .addEventLog(event.format("sighash"), "0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168", log.data, ...log.topics.slice(1));

      const findings = await handler(transaction);

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Uniswap V3 Swap",
          description: `Swap detected in pool: 0x4585fe77225b41b697c938b018e2ac67ac5a20c0`, 
          alertId: "UNISWAP-1",
          protocol: "uniswap v3",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            sender: createAddress("0xf0"),
            recipient: createAddress("0xf0"),
            pool: "0x4585fe77225b41b697c938b018e2ac67ac5a20c0",
            token0: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
            token1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            fee: "500",
          },
        }),
        Finding.fromObject({
          name: "Uniswap V3 Swap",
          description: `Swap detected in pool: 0x5777d92f208679db4b9778590fa3cab3ac9e2168`, 
          alertId: "UNISWAP-1",
          protocol: "uniswap v3",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            sender: createAddress("0xf0"),
            recipient: createAddress("0xf0"),
            pool: "0x5777d92f208679db4b9778590fa3cab3ac9e2168",
            token0: "0x6b175474e89094c44da98b954eedeac495271d0f",
            token1: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            fee: "100",
          },
        }),
      ]);
      
    });*/

    
  });
});
