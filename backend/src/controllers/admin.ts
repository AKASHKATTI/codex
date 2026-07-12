import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { serializeBigInt } from "./contests";

const prisma = new PrismaClient();

/**
 * GET /api/admin/analytics
 * Retrieves key platform analytics for transparency and metrics dashboard.
 */
export async function getAnalytics(req: Request, res: Response) {
  try {
    const totalUsers = await prisma.user.count();
    const totalContests = await prisma.contest.count();
    const totalMatches = await prisma.match.count();
    
    // Sum of all contest entry fees paid by all joined teams
    const contests = await prisma.contest.findMany({
      select: {
        entryFee: true,
        _count: {
          select: { teams: true },
        },
      },
    });

    let totalEscrowLovelace = 0n;
    for (const c of contests) {
      totalEscrowLovelace += c.entryFee * BigInt(c._count?.teams || 0);
    }

    const totalTransactions = await prisma.transaction.count();
    const recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentPayouts = await prisma.transaction.findMany({
      where: { type: "PAYOUT" },
      include: {
        user: { select: { username: true, walletAddress: true } },
        contest: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const analytics = {
      summary: {
        totalUsers,
        totalContests,
        totalMatches,
        totalEscrowADA: (totalEscrowLovelace / 1000000n).toString(),
        totalEscrowLovelace: totalEscrowLovelace.toString(),
        totalTransactions,
      },
      recentPayouts,
      recentAuditLogs,
    };

    res.json(serializeBigInt(analytics));
  } catch (error) {
    console.error("Error in getAnalytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
