import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/auth";
import { serializeBigInt } from "./contests";

const prisma = new PrismaClient();

/**
 * POST /api/contests/:id/join
 * Join a contest by submitting selected fantasy players and the on-chain deposit transaction hash.
 */
export async function joinContest(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: contestId } = req.params;
    const { players, txHash } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!players || !txHash) {
      return res.status(400).json({ error: "Missing required fields (players, txHash)" });
    }

    // Retrieve contest details
    let contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: { _count: { select: { teams: true } } },
    });

    if (!contest && contestId.startsWith("contest-")) {
      console.log(`[MOCK] Dynamically creating mock contest record during join: ${contestId}`);
      let match = await prisma.match.findFirst({
        where: { homeTeam: "India", awayTeam: "Australia" }
      });
      if (!match) {
        match = await prisma.match.create({
          data: {
            homeTeam: "India",
            awayTeam: "Australia",
            status: "SCHEDULED",
            matchDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          }
        });
      }

      contest = await prisma.contest.create({
        data: {
          id: contestId,
          title: contestId === "contest-1" ? "India vs Australia Mega Contest" : "India vs Australia Head-to-Head",
          description: "Build your ultimate fantasy squad. Top 3 scorers share the prize pool locked in our Aiken contract.",
          entryFee: contestId === "contest-1" ? 10000000n : 25000000n,
          maxPlayers: 10,
          matchId: match.id,
          status: "UPCOMING",
          prizePool: 0n,
          escrowAddress: "addr_test1wpfairstake_escrow_address_here",
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
        include: { _count: { select: { teams: true } } },
      }) as any;
    }

    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    if (contest.status !== "UPCOMING" && contest.status !== "ACTIVE") {
      return res.status(400).json({ error: "Contest is no longer open for entries" });
    }

    if (contest.maxPlayers && contest._count.teams >= contest.maxPlayers) {
      return res.status(400).json({ error: "Contest is full" });
    }

    // Verify transaction hash hasn't been used before
    const existingTx = await prisma.transaction.findUnique({
      where: { txHash },
    });

    if (existingTx) {
      return res.status(400).json({ error: "Transaction hash has already been registered" });
    }

    // Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction record (LOCKED ADA in Escrow)
      const transaction = await tx.transaction.create({
        data: {
          userId,
          contestId,
          txHash,
          amount: contest.entryFee,
          type: "DEPOSIT",
          status: "CONFIRMED", // Set to confirmed for hackathon flow; blockfrost validates on preprod
        },
      });

      // 2. Create Fantasy Team
      const fantasyTeam = await tx.fantasyTeam.create({
        data: {
          userId,
          contestId,
          players: typeof players === "string" ? players : JSON.stringify(players),
          score: 0.0,
        },
      });

      // 3. Update Contest's Prize Pool
      const updatedContest = await tx.contest.update({
        where: { id: contestId },
        data: {
          prizePool: {
            increment: contest.entryFee,
          },
        },
      });

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          action: "JOIN_CONTEST",
          details: `User ${userId} joined contest ${contestId} with tx ${txHash}`,
        },
      });

      return { fantasyTeam, transaction, updatedContest };
    });

    res.status(201).json(serializeBigInt(result));
  } catch (error) {
    console.error("Error in joinContest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/my-teams
 * Get all fantasy teams for the logged-in user.
 */
export async function getMyTeams(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const teams = await prisma.fantasyTeam.findMany({
      where: { userId },
      include: {
        contest: {
          include: {
            match: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(serializeBigInt(teams));
  } catch (error) {
    console.error("Error in getMyTeams:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
