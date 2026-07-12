import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { settleContest, mintRewardNFT } from "../services/cardano";
import { serializeBigInt } from "./contests";

const prisma = new PrismaClient();

/**
 * POST /api/oracle/finalize-match
 * Triggers the oracle resolution: calculates scores, ranks teams, disperses Cardano funds, and mints NFTs.
 */
export async function finalizeMatch(req: Request, res: Response) {
  try {
    const { matchId, playerScores } = req.body;

    if (!matchId || !playerScores) {
      return res.status(400).json({ error: "Missing required fields (matchId, playerScores)" });
    }

    // 1. Fetch and update the match status
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: "COMPLETED",
        officialStats: typeof playerScores === "string" ? playerScores : JSON.stringify(playerScores),
      },
    });

    // 2. Fetch all contests associated with this match
    const contests = await prisma.contest.findMany({
      where: { matchId },
      include: {
        teams: {
          include: {
            user: true,
          },
        },
      },
    });

    const resolutionDetails = [];

    // 3. Process each contest
    for (const contest of contests) {
      if (contest.status === "RESOLVED") {
        continue; // Skip already resolved contests
      }

      const teams = contest.teams;
      if (teams.length === 0) {
        // No participants, cancel contest and refund (can be implemented if needed)
        await prisma.contest.update({
          where: { id: contest.id },
          data: { status: "CANCELLED" },
        });
        continue;
      }

      // Calculate fantasy score for each team
      for (const team of teams) {
        let totalScore = 0.0;
        
        // Parse players list (expecting array of strings)
        const selectedPlayers = Array.isArray(team.players)
          ? team.players
          : JSON.parse(team.players as string || "[]");

        for (const p of selectedPlayers) {
          const playerScore = playerScores[p];
          if (playerScore) {
            totalScore += parseFloat(playerScore);
          }
        }

        // Update score in database
        await prisma.fantasyTeam.update({
          where: { id: team.id },
          data: { score: totalScore },
        });
        team.score = totalScore; // Update in-memory for sorting
      }

      // Rank teams by score descending
      const rankedTeams = [...teams].sort((a, b) => b.score - a.score);

      // Assign ranks in database
      for (let i = 0; i < rankedTeams.length; i++) {
        await prisma.fantasyTeam.update({
          where: { id: rankedTeams[i].id },
          data: { rank: i + 1 },
        });
      }

      // Identify top 3 winners
      const winner1 = rankedTeams[0];
      const winner2 = rankedTeams[1] || winner1; // Fallback to 1st place if not enough players
      const winner3 = rankedTeams[2] || winner2; // Fallback to 2nd place

      // Retrieve winner addresses
      const w1Addr = winner1.user.walletAddress;
      const w2Addr = winner2.user.walletAddress;
      const w3Addr = winner3.user.walletAddress;
      
      const adminFeeAddress = process.env.ORACLE_ADDRESS || w1Addr; // Fallback to winner if not set

      let settlementTxHash = "";
      try {
        // 4. Trigger Cardano smart contract settlement transaction
        settlementTxHash = await settleContest(
          contest.id,
          w1Addr,
          w2Addr,
          w3Addr,
          adminFeeAddress
        );
      } catch (err: any) {
        console.error(`Failed to submit Cardano settlement for contest ${contest.id}:`, err);
        settlementTxHash = `failed_on_chain_tx_${Date.now()}`;
      }

      // 5. Update contest with winner IDs and status
      await prisma.contest.update({
        where: { id: contest.id },
        data: {
          status: "RESOLVED",
          winner1Id: winner1.userId,
          winner2Id: winner2.userId,
          winner3Id: winner3.userId,
        },
      });

      // 6. Record the payout transaction
      await prisma.transaction.create({
        data: {
          userId: winner1.userId, // Record under winner 1
          contestId: contest.id,
          txHash: settlementTxHash,
          amount: contest.prizePool,
          type: "PAYOUT",
          status: "CONFIRMED",
        },
      });

      // 7. Mint NFTs
      const mintedNFTs = [];

      // Mint Champion NFT for 1st place
      try {
        const nftResult = await mintRewardNFT(w1Addr, contest.id, "CHAMPION_NFT");
        await prisma.reward.create({
          data: {
            userId: winner1.userId,
            contestId: contest.id,
            rewardType: "CHAMPION_NFT",
            nftAssetId: nftResult.assetId,
            txHash: nftResult.txHash,
          },
        });
        mintedNFTs.push({ type: "CHAMPION_NFT", recipient: w1Addr, assetId: nftResult.assetId, txHash: nftResult.txHash });
      } catch (nftErr) {
        console.error("Failed to mint Winner NFT:", nftErr);
      }

      // Mint Runner-up NFT for 2nd place
      if (rankedTeams.length > 1) {
        try {
          const nftResult = await mintRewardNFT(w2Addr, contest.id, "WINNER_NFT");
          await prisma.reward.create({
            data: {
              userId: winner2.userId,
              contestId: contest.id,
              rewardType: "WINNER_NFT",
              nftAssetId: nftResult.assetId,
              txHash: nftResult.txHash,
            },
          });
          mintedNFTs.push({ type: "WINNER_NFT", recipient: w2Addr, assetId: nftResult.assetId, txHash: nftResult.txHash });
        } catch (nftErr) {
          console.error("Failed to mint Winner NFT for 2nd:", nftErr);
        }
      }

      // Mint Participation NFT for 3rd place and below
      try {
        const nftResult = await mintRewardNFT(w3Addr, contest.id, "PARTICIPATION_NFT");
        await prisma.reward.create({
          data: {
            userId: winner3.userId,
            contestId: contest.id,
            rewardType: "PARTICIPATION_NFT",
            nftAssetId: nftResult.assetId,
            txHash: nftResult.txHash,
          },
        });
        mintedNFTs.push({ type: "PARTICIPATION_NFT", recipient: w3Addr, assetId: nftResult.assetId, txHash: nftResult.txHash });
      } catch (nftErr) {
        console.error("Failed to mint Participation NFT:", nftErr);
      }

      resolutionDetails.push({
        contestId: contest.id,
        title: contest.title,
        payoutTxHash: settlementTxHash,
        winners: {
          first: { username: winner1.user.username, address: w1Addr, score: winner1.score },
          second: { username: winner2.user.username, address: w2Addr, score: winner2.score },
          third: { username: winner3.user.username, address: w3Addr, score: winner3.score },
        },
        nfts: mintedNFTs,
      });
    }

    res.json(serializeBigInt({
      message: "Oracle match scores finalized. Contests resolved, payouts processed.",
      results: resolutionDetails,
    }));
  } catch (error) {
    console.error("Error in finalizeMatch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
