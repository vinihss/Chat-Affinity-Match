import { Router } from "express";
import { randomUUID } from "crypto";
import { db, usersTable, matchesTable } from "@workspace/db";
import { eq, and, or, inArray } from "drizzle-orm";
import {
  JoinQueueBody,
  LeaveQueueBody,
  GetQueueStatusParams,
} from "@workspace/api-zod";

const router = Router();

const waitingQueue = new Map<string, { userId: string; joinedAt: number }>();

function computeAffinity(topicsA: string[], topicsB: string[]): { common: string[]; score: number } {
  const setB = new Set(topicsB);
  const common = topicsA.filter((t) => setB.has(t));
  return { common, score: common.length };
}

async function findBestMatch(userId: string, userTopics: string[]): Promise<string | null> {
  let bestMatchId: string | null = null;
  let bestScore = -1;

  for (const [queuedUserId] of waitingQueue) {
    if (queuedUserId === userId) continue;

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, queuedUserId))
      .limit(1);

    if (users.length === 0) continue;
    const { score } = computeAffinity(userTopics, users[0].topics);

    if (score > bestScore) {
      bestScore = score;
      bestMatchId = queuedUserId;
    }
  }

  return bestMatchId;
}

router.post("/join", async (req, res) => {
  const parsed = JoinQueueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { userId } = parsed.data;

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (users.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const user = users[0];

  const partnerId = await findBestMatch(userId, user.topics);

  if (partnerId) {
    waitingQueue.delete(partnerId);
    waitingQueue.delete(userId);

    const partnerUsers = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, partnerId))
      .limit(1);

    const partner = partnerUsers[0];
    const { common, score } = computeAffinity(user.topics, partner.topics);

    const matchId = randomUUID();
    await db.insert(matchesTable).values({
      id: matchId,
      user1Id: userId,
      user2Id: partnerId,
      commonTopics: common,
      affinityScore: score,
      status: "active",
    });

    res.json({
      status: "matched",
      matchId,
      partnerId,
      partnerNickname: partner.nickname,
      partnerGender: partner.gender,
      partnerTopics: partner.topics,
      commonTopics: common,
      affinityScore: score,
      waitingCount: waitingQueue.size,
    });
    return;
  }

  waitingQueue.set(userId, { userId, joinedAt: Date.now() });

  res.json({
    status: "waiting",
    matchId: null,
    partnerId: null,
    partnerNickname: null,
    partnerGender: null,
    partnerTopics: null,
    commonTopics: null,
    affinityScore: null,
    waitingCount: waitingQueue.size,
  });
});

router.post("/leave", async (req, res) => {
  const parsed = LeaveQueueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  waitingQueue.delete(parsed.data.userId);
  res.json({ message: "Left queue" });
});

router.get("/status/:userId", async (req, res) => {
  const parsed = GetQueueStatusParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const { userId } = parsed.data;

  const activeMatches = await db
    .select()
    .from(matchesTable)
    .where(
      and(
        or(eq(matchesTable.user1Id, userId), eq(matchesTable.user2Id, userId)),
        eq(matchesTable.status, "active")
      )
    )
    .orderBy(matchesTable.createdAt)
    .limit(1);

  if (activeMatches.length > 0) {
    const match = activeMatches[activeMatches.length - 1];
    const partnerId = match.user1Id === userId ? match.user2Id : match.user1Id;

    const partners = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, partnerId))
      .limit(1);

    const partner = partners[0];

    res.json({
      status: "matched",
      matchId: match.id,
      partnerId,
      partnerNickname: partner?.nickname ?? "Desconhecido",
      partnerGender: partner?.gender ?? "",
      partnerTopics: partner?.topics ?? [],
      commonTopics: match.commonTopics,
      affinityScore: match.affinityScore,
      waitingCount: waitingQueue.size,
    });
    return;
  }

  const isInQueue = waitingQueue.has(userId);

  res.json({
    status: isInQueue ? "waiting" : "waiting",
    matchId: null,
    partnerId: null,
    partnerNickname: null,
    partnerGender: null,
    partnerTopics: null,
    commonTopics: null,
    affinityScore: null,
    waitingCount: waitingQueue.size,
  });
});

export { waitingQueue };
export default router;
