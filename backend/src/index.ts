import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authenticateJWT } from "./middlewares/auth";
import { errorHandler } from "./middlewares/error";
import { getNonce, loginWithWallet, getMe } from "./controllers/auth";
import { getContests, getContest, createContest, createMatch, getMatches } from "./controllers/contests";
import { joinContest, getMyTeams } from "./controllers/teams";
import { getOverallLeaderboard } from "./controllers/leaderboard";
import { finalizeMatch } from "./controllers/oracle";
import { getAnalytics } from "./controllers/admin";
import { getLucid } from "./services/cardano";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "*" })); // In production, narrow this to the frontend URL
app.use(express.json());

// Initialize Lucid Connection on Startup
getLucid()
  .then(() => console.log("Cardano Blockchain service initialized successfully."))
  .catch((err) => console.error("Cardano Blockchain service failed to initialize:", err));

// --- API ROUTES ---

// 1. Authentication Routes
app.get("/api/auth/nonce", getNonce);
app.post("/api/auth/login", loginWithWallet);
app.get("/api/auth/me", authenticateJWT, getMe);

// 2. Sports Matches & Contests
app.get("/api/matches", getMatches);
app.get("/api/contests", getContests);
app.get("/api/contests/:id", getContest);

// 3. User Fantasy Teams (Protected)
app.post("/api/contests/:id/join", authenticateJWT, joinContest);
app.get("/api/my-teams", authenticateJWT, getMyTeams);

// 4. Leaderboard stand-alone
app.get("/api/leaderboard", getOverallLeaderboard);

// 5. Mock Oracle
app.post("/api/oracle/finalize-match", finalizeMatch);

// 6. Admin and Transparency metrics
app.post("/api/admin/matches", createMatch);
app.post("/api/admin/contests", createContest);
app.get("/api/admin/analytics", getAnalytics);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`FairStake Backend listening on port ${PORT}`);
});
