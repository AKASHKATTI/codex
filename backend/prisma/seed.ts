import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding FairStake database...");

  // 1. Create a default mock user so Prisma relations don't fail
  const mockUser = await prisma.user.upsert({
    where: { walletAddress: "addr_test1qru_mock_user_address_cardano_preprod_faucet_funded" },
    update: {},
    create: {
      username: "FS_MockPlayer",
      walletAddress: "addr_test1qru_mock_user_address_cardano_preprod_faucet_funded",
    },
  });
  console.log(`Mock user seeded: ${mockUser.username}`);

  // 2. Create standard matches
  const match1 = await prisma.match.create({
    data: {
      homeTeam: "India",
      awayTeam: "Australia",
      status: "SCHEDULED",
      matchDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    },
  });

  const match2 = await prisma.match.create({
    data: {
      homeTeam: "England",
      awayTeam: "South Africa",
      status: "COMPLETED",
      matchDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      homeScore: 285,
      awayScore: 282,
      officialStats: JSON.stringify({
        "Virat Kohli": "0", // Not in this match
        "Steve Smith": "0",
        "Glenn Maxwell": "0",
        "Joe Root": "85",
        "Ben Stokes": "45",
        "Quinton de Kock": "110",
        "Kagiso Rabada": "60"
      })
    },
  });
  console.log("Matches seeded.");

  // 3. Create contests
  const contest1 = await prisma.contest.create({
    data: {
      title: "India vs Australia Mega Contest",
      description: "Build your ultimate fantasy squad. Top 3 scorers share the prize pool locked in our Aiken contract.",
      entryFee: 10000000n, // 10 ADA
      maxPlayers: 10,
      matchId: match1.id,
      status: "UPCOMING",
      prizePool: 0n,
      escrowAddress: "addr_test1wpfairstake_escrow_address_here",
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  const contest2 = await prisma.contest.create({
    data: {
      title: "India vs Australia Head-to-Head",
      description: "Winner takes all double-up. Safe escrow contract, legal skill-based sports betting alternative.",
      entryFee: 25000000n, // 25 ADA
      maxPlayers: 2,
      matchId: match1.id,
      status: "UPCOMING",
      prizePool: 0n,
      escrowAddress: "addr_test1wpfairstake_escrow_address_here",
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  const contest3 = await prisma.contest.create({
    data: {
      title: "England vs South Africa Champions Cup",
      description: "Resolved contest. Payouts complete. Placement NFTs successfully minted on Preprod.",
      entryFee: 5000000n, // 5 ADA
      maxPlayers: 20,
      matchId: match2.id,
      status: "RESOLVED",
      prizePool: 95000000n,
      escrowAddress: "addr_test1wpfairstake_escrow_address_here",
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      winner1Id: mockUser.id,
      winner2Id: mockUser.id,
      winner3Id: mockUser.id,
    },
  });

  // Seed mock teams in completed contest for demonstration
  await prisma.fantasyTeam.create({
    data: {
      userId: mockUser.id,
      contestId: contest3.id,
      players: JSON.stringify(["Joe Root", "Ben Stokes"]),
      score: 130.0,
      rank: 1,
    }
  });

  console.log("Contests and teams seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
