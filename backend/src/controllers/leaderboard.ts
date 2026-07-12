import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/leaderboard
 * Fetch the overall user standings based on aggregated fantasy team scores.
 */
export async function getOverallLeaderboard(req: Request, res: Response) {
  try {
    // Aggregates user fantasy team scores
    const leaderboard = await prisma.fantasyTeam.groupBy({
      by: ["userId"],
      _sum: {
        score: true,
      },
      orderBy: {
        _sum: {
          score: "desc",
        },
      },
      take: 20, // Return top 20 users
    });

    // Hydrate user data (username, wallet address)
    const hydratedLeaderboard = await Promise.all(
      leaderboard.map(async (entry) => {
        const user = await prisma.user.findUnique({
          where: { id: entry.userId },
          select: { username: true, walletAddress: true },
        });
        return {
          userId: entry.userId,
          username: user?.username || "Unknown Player",
          walletAddress: user?.walletAddress || "",
          totalScore: entry._sum.score || 0.0,
        };
      })
    );

    res.json(hydratedLeaderboard);
  } catch (error) {
    console.error("Error in getOverallLeaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
