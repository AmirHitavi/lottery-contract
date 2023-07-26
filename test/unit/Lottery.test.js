const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", function () {
          let lottery, vrfCoordinatorV2Mock
          let lotteryEntranceFee, lotteryInterval
          const chainId = network.config.chainId
          let deployer, player

          beforeEach(async () => {
              await deployments.fixture("all")
              lottery = await ethers.getContract("Lottery")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              lotteryEntranceFee = await lottery.getEnteranceFee()
              lotteryInterval = await lottery.getInterval()
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]
          })

          describe("Constructor", function () {
              it("Should set state correctly", async () => {
                  const lotteryState = await lottery.getLotteryState()
                  assert.equal(lotteryState.toString(), "0")
              })
              it("Should set entrance fee correctly", async () => {
                  const entranceFee = await lottery.getEnteranceFee()
                  assert.equal(entranceFee.toString(), networkConfig[chainId]["entranceFee"])
              })
              it("Should set key hash fee correctly", async () => {
                  const keyHash = await lottery.getKeyHash()
                  assert.equal(keyHash.toString(), networkConfig[chainId]["keyHash"])
              })
              it("Should set callback gas limit correctly", async () => {
                  const callbackGasLimit = await lottery.getCallbackGasLimit()
                  assert.equal(
                      callbackGasLimit.toString(),
                      networkConfig[chainId]["callbackGasLimit"],
                  )
              })
              it("Should set interval correctly", async () => {
                  const interval = await lottery.getInterval()
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("enterLottery", function () {
              it("doesn't allow entrance when raffle is calculating", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [lotteryInterval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await lottery.performUpkeep([])
                  await expect(
                      lottery.enterLottery({ value: lotteryEntranceFee }),
                  ).to.be.revertedWith("Lottery__NotOpen")
              })
              it("Revert when you don't pay enough", async () => {
                  await expect(lottery.enterLottery()).to.be.revertedWith("Lottery__NotEnoughETH")
              })
              it("Records players when they enter", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  const player = await lottery.getPlayer(0)
                  assert.equal(player, deployer.address)
              })
              it("emits event on enter", async () => {
                  await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(
                      lottery,
                      "LotteryEnter",
                  )
              })
          })
          describe("checkUpkeep", function () {
              it("returns true if all conditions are true", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [lotteryInterval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(upkeepNeeded)
              })
              it("returns false if has no balance", async () => {
                  await network.provider.send("evm_increaseTime", [lotteryInterval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("returns false if state not open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [lotteryInterval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const lotteryState = await lottery.getLotteryState()
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert.equal(lotteryState.toString() == "1", upkeepNeeded == false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [lotteryInterval.toNumber() - 10])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
          })
          describe("performUpkeep", function () {
              it("can only run if checkupkeep is true", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [lotteryInterval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const transaction = await lottery.performUpkeep([])
                  assert(transaction)
              })
              it("reverts if checkup is false", async () => {
                  await expect(lottery.performUpkeep([])).to.be.revertedWith(
                      "Lottery__UpkeepNotNeeded",
                  )
              })
              it("updates the lottery state and emits a requestId", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [lotteryInterval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const transactionResponse = await lottery.performUpkeep([])
                  const transactionReceipt = await transactionResponse.wait(1)
                  const lotteryState = await lottery.getLotteryState()
                  const requestId = transactionReceipt.events[1].args.requestId
                  assert(requestId.toNumber() > 0)
                  assert(lotteryState == "1")
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [lotteryInterval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("can only be called after performupkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address),
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address),
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(2, lottery.address),
                  ).to.be.revertedWith("nonexistent request")
              })

              it("picks a winner, resets, and sends money", async () => {
                  const additionalEntrances = 3
                  const startingIndex = 1
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      lottery = lottery.connect(accounts[i])
                      await lottery.enterLottery({ value: lotteryEntranceFee })
                  }
                  const startingTimeStamp = await lottery.getLastTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              const recentWinner = await lottery.getRecentWinner()
                              const lotteryState = await lottery.getLotteryState()
                              const winnerBalance = await accounts[1].getBalance()
                              const endingTimeStamp = await lottery.getLastTimeStamp()
                              await expect(lottery.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[1].address)
                              assert.equal(lotteryState, 0)
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance
                                      .add(
                                          lotteryEntranceFee
                                              .mul(additionalEntrances)
                                              .add(lotteryEntranceFee),
                                      )
                                      .toString(),
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })

                      const transactionResponse = await lottery.performUpkeep("0x")
                      const transactionReceipt = await transactionResponse.wait(1)
                      const startingBalance = await accounts[1].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          transactionReceipt.events[1].args.requestId,
                          lottery.address,
                      )
                  })
              })
          })
          describe("getNumberWords", function () {
              it("returns number words", async () => {
                  const numberWords = await lottery.getNumberWords()
                  assert.equal(numberWords.toString(), 1)
              })
          })
          describe("getRequestConfirmations", function () {
              it("returns request confirmations", async () => {
                  const requestConfirmations = await lottery.getRequestConfirmations()
                  assert.equal(requestConfirmations.toString(), 3)
              })
          })
          describe("getNumberOfPlayers", function () {
              it("returns number of players", async () => {
                  const numberOfPlayers = await lottery.getNumberOfPlayers()
                  assert.equal(numberOfPlayers.toString(), 0)
              })
          })
      })
