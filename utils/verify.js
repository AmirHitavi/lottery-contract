const { run } = require("hardhat")

async function verify(contractAddress, args) {
    console.log("trying to verify contract")
    try {
        await run("verify: verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (err) {
        if (err.message.toLowerCase().includes("already verified")) {
            console.log("already verified")
        } else {
            console.log(err)
        }
    }
}
