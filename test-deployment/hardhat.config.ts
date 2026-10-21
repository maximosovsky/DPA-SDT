import { defineConfig } from 'hardhat/config';
import hardhatToolboxViem from '@nomicfoundation/hardhat-toolbox-viem';
export default defineConfig({plugins:[hardhatToolboxViem],solidity:{version:'0.8.28',settings:{optimizer:{enabled:true,runs:200}}},networks:{hardhatMainnet:{type:'edr-simulated',chainType:'l1'},localhost:{type:'http',url:'http://127.0.0.1:8545'}}});
