const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const FUND_AMOUNT = ethers.utils.parseEther("1")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainID = network.config.chainId

    let VRFCoordinatorV2Address
    let subscriptionId

    if (chainID == 31337) {
        const VRFCoordinatorV2 = await ethers.getContract("VRFCoordinatorV2Mock")
        VRFCoordinatorV2Address = VRFCoordinatorV2.address
        // create subscription and fund it
        const transactionResponse = await VRFCoordinatorV2.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionId = transactionReceipt.events[0].args.subId
        await VRFCoordinatorV2.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        VRFCoordinatorV2Address = networkConfig[chainID]["VRFCoordinatorV2"]
        subscriptionId = networkConfig[chainID]["subscriptionId"]
    }

    const args = [
        ethers.utils.parseEther("0.01"),
        VRFCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainID]["keyHash"],
        networkConfig[chainID]["callbackGasLimit"],
        networkConfig[chainID]["interval"],
    ]

    log("========================================================")
    log("Deploying Lottery contract and and waiting for Block confirmation...")
    const lottery = await deploy("Lottery", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    log(`Lottery contract deployed to ${lottery.address}`)

    // Ensure the Lottery contract is a valid consumer of the VRFCoordinatorV2Mock contract.
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, lottery.address)
    }

    // verify the deployment to etherscan
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(lottery.address, args)
    }
    log("===========================================================")
}

module.exports.tags = ["all", "lottery"]
