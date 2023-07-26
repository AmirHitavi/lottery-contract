# Lottery Contract

- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Quickstart](#quickstart)
- [Usage](#usage)
  - [Testing](#testing)
    - [Test Coverage](#test-coverage)
- [Deployment to a testnet or mainnet](#deployment-to-a-testnet-or-mainnet)
  - [Verify on etherscan](#verify-on-etherscan)

**This project is an implementation of lottery contract using Chainlink VRF and automation**

# Getting Started

## Requirements

- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Nodejs](https://nodejs.org/en/)

## Quickstart

```
git clone https://github.com/AmirHitavi/lottery-contract
cd lottery-contract
npm install
```

# Usage

Deploy:

```
npx hardhat deploy --network <network name>
```

## Testing

Test:

```
npx hardhat test
```

Test Coverage:

```
npx hardhat coverage
```

# Deployment to a testnet or mainnet

1. Setup environment variabltes

You'll want to set your `SEPOLIA_URL` and `PRIVATE_KEY` as environment variables. You can add them to a `.env` file.

- `SEPOLIA_URL`: This is url of the sepolia testnet node you're working with. if you don't have it, you can get free from [Alchemy](https://alchemy.com/?a=673c802981)
- `PRIVATE_KEY`: The private key of your account (like from [metamask](https://metamask.io/)). **NOTE:** FOR DEVELOPMENT, PLEASE USE A KEY THAT DOESN'T HAVE ANY REAL FUNDS ASSOCIATED WITH IT.
  - You can [learn how to export it here](https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-Export-an-Account-Private-Key).

2. Get testnet ETH

Go ahed to [faucets.chain.link](https://faucets.chain.link/) and get some tesnet ETH & LINK.

3. Setup a Chainlink VRF Subscription ID

Head over to [vrf.chain.link](https://vrf.chain.link/) and setup a new subscription, and get a subscriptionId.

1. A subscription ID
2. Your subscription should be funded with LINK
3. Deploy your contract

In your `helper-hardhat-config.js` add your `subscriptionId` under the section of the chainId you're using.
Then run:

```
npx hardhat deploy --network sepolia
```

4. Add your contract address as a Chainlink VRF Consumer

Go back to [vrf.chain.link](https://vrf.chain.link) and under your subscription add `Add consumer` and add your contract address. You should also fund the contract with some LINK.

5. Register a Chainlink Keepers Upkeep

[You can follow the documentation if you get lost.](https://docs.chain.link/docs/chainlink-keepers/compatible-contracts/)

Go to [automation.chain.link](https://automation.chain.link/new) and register a new upkeep. Choose `Custom logic` as your trigger mechanism for automation.

6. Enter your lottery!

You're contract is now setup to be a tamper proof autonomous verifiably random lottery. Enter the lottery by running:

```
npx hardhat run scripts/enter.js --network sepolia
```

## Verify on etherscan

you can verify your contract, If you deploy to a testnet or mainnet by getting [API Key](https://etherscan.io/myapikey) from Etherscan and set it as an environemnt variable named `ETHERSCAN_API_KEY.

In it's current state, if you have your api key set, it will auto verify sepolia contract!
However, you can manual verify with:

```
npx hardhat verify --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS
```
