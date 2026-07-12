import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to convert BigInt values to string for JSON serialization
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    // If it's a Date, return it as ISO string
    if (obj instanceof Date) return obj.toISOString();
    
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = serializeBigInt(obj[key]);
    }
    return newObj;
  }
  return obj;
}

/**
 * GET /api/contests
 * Fetch all contests with optional filters.
 */
export async function getContests(req: Request, res: Response) {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        match: true,
        _count: {
          select: { teams: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(serializeBigInt(contests));
  } catch (error) {
    console.error("Error in getContests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/contests/:id
 * Get details for a single contest, including leaderboard.
 */
export async function getContest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        match: true,
        teams: {
          include: {
            user: {
              select: { username: true, walletAddress: true },
            },
          },
          orderBy: { score: "desc" },
        },
      },
    });

    if (!contest && id.startsWith("contest-")) {
      console.log(`[MOCK] Dynamically creating mock contest record for: ${id}`);
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
          id,
          title: id === "contest-1" ? "India vs Australia Mega Contest" : "India vs Australia Head-to-Head",
          description: "Build your ultimate fantasy squad. Top 3 scorers share the prize pool locked in our Aiken contract.",
          entryFee: id === "contest-1" ? 10000000n : 25000000n,
          maxPlayers: 10,
          matchId: match.id,
          status: "UPCOMING",
          prizePool: 0n,
          escrowAddress: "addr_test1wpfairstake_escrow_address_here",
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
        include: {
          match: true,
          teams: {
            include: {
              user: {
                select: { username: true, walletAddress: true },
              },
            },
            orderBy: { score: "desc" },
          },
        },
      });
    }

    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    res.json(serializeBigInt(contest));
  } catch (error) {
    console.error("Error in getContest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/admin/matches
 * Create a new sports match (Admin only).
 */
export async function createMatch(req: Request, res: Response) {
  try {
    const { homeTeam, awayTeam, matchDate } = req.body;

    if (!homeTeam || !awayTeam || !matchDate) {
      return res.status(400).json({ error: "Missing required fields (homeTeam, awayTeam, matchDate)" });
    }

    const match = await prisma.match.create({
      data: {
        homeTeam,
        awayTeam,
        matchDate: new Date(matchDate),
      },
    });

    res.status(201).json(match);
  } catch (error) {
    console.error("Error in createMatch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/admin/contests
 * Create a new fantasy contest (Admin only).
 */
export async function createContest(req: Request, res: Response) {
  try {
    const { title, description, entryFee, maxPlayers, matchId, deadline, escrowAddress } = req.body;

    if (!title || !description || !entryFee || !maxPlayers || !matchId || !deadline || !escrowAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const contest = await prisma.contest.create({
      data: {
        title,
        description,
        entryFee: BigInt(entryFee || 0),
        maxPlayers: parseInt(maxPlayers),
        matchId,
        escrowAddress,
        deadline: new Date(deadline),
      },
    });

    res.status(201).json(serializeBigInt(contest));
  } catch (error) {
    console.error("Error in createContest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/matches
 * List all matches.
 */
export async function getMatches(req: Request, res: Response) {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { matchDate: "asc" },
    });
    res.json(matches);
  } catch (error) {
    console.error("Error in getMatches:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
