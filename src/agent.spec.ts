import {
  FindingType,
  FindingSeverity,
  Finding,
  HandleTransaction,
  TransactionEvent,
} from "forta-agent";

import agent from "./agent";

import { TestTransactionEvent } from "forta-agent-tools/lib/tests";
import { createAddress } from "forta-agent-tools/lib/tests";
import { encodeParameter } from "forta-agent-tools";
import { Interface } from "@ethersproject/abi";

const ABI: string[] = [
  "event Swap( address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick )",
];

const TEST_IFACE: Interface = new Interface([
  ...ABI,
  "event Swap( address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick )",
]);


describe("Uniswap swap bot", () => {
  
 
  
  describe("handleTransaction", () => {

    //Empty findings

    it("returns empty findings if there are no swap events", async () => {
      
      const transaction: TransactionEvent = new TestTransactionEvent().setFrom(createAddress("0x0")).setTo(createAddress("0x0"));
      const findings = await agent.handleTransaction(transaction);

      expect(findings).toStrictEqual([]);
      
    });



    //Transaction found

    it("returns findings if there is a Uniswap V3 swap", async () => {
      
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

      const transaction: TransactionEvent = new TestTransactionEvent().setFrom(createAddress("0x0")).setTo(createAddress("0x0")).addInvolvedAddresses("0x4585fe77225b41b697c938b018e2ac67ac5a20c0")
      .addEventLog(event.format("sighash"), createAddress("0xdead"), log.data, ...log.topics.slice(1));

      const findings = await agent.handleTransaction(transaction);

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

    
  });
});
