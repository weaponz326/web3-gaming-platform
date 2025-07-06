async function main() {
  const RPS = await ethers.getContractFactory("RockPaperScissors");
  const rps = await RPS.deploy();
  await rps.deployed();
  console.log("RPS deployed to:", rps.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
