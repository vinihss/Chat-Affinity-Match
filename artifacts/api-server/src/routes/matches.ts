import { Router } from "express";
import { randomUUID } from "crypto";
import { db, matchesTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and, or, asc } from "drizzle-orm";
import {
  GetMessagesParams,
  SendMessageParams,
  SendMessageBody,
  SkipMatchParams,
  SkipMatchBody,
  EndMatchParams,
  EndMatchBody,
} from "@workspace/api-zod";
import { waitingQueue } from "./queue.js";

const router = Router();

router.get("/:matchId/messages", async (req, res) => {
  const parsed = GetMessagesParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.matchId, parsed.data.matchId))
    .orderBy(asc(messagesTable.sentAt));

  res.json(
    messages.map((m) => ({
      id: m.id,
      matchId: m.matchId,
      senderId: m.senderId,
      senderNickname: m.senderNickname,
      content: m.content,
      sentAt: m.sentAt.toISOString(),
    }))
  );
});

router.post("/:matchId/messages", async (req, res) => {
  const paramsParsed = SendMessageParams.safeParse(req.params);
  const bodyParsed = SendMessageBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { matchId } = paramsParsed.data;
  const { senderId, content } = bodyParsed.data;

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, senderId))
    .limit(1);

  const senderNickname = users[0]?.nickname ?? "Desconhecido";

  const inserted = await db
    .insert(messagesTable)
    .values({
      id: randomUUID(),
      matchId,
      senderId,
      senderNickname,
      content,
    })
    .returning();

  const msg = inserted[0];
  res.json({
    id: msg.id,
    matchId: msg.matchId,
    senderId: msg.senderId,
    senderNickname: msg.senderNickname,
    content: msg.content,
    sentAt: msg.sentAt.toISOString(),
  });
});

router.post("/:matchId/next", async (req, res) => {
  const paramsParsed = SkipMatchParams.safeParse(req.params);
  const bodyParsed = SkipMatchBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { matchId } = paramsParsed.data;
  const { userId } = bodyParsed.data;

  await db
    .update(matchesTable)
    .set({ status: "ended", endedAt: new Date() })
    .where(eq(matchesTable.id, matchId));

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (users.length === 0) {
    res.json({ status: "waiting", matchId: null, partnerId: null, partnerNickname: null, partnerGender: null, partnerTopics: null, commonTopics: null, affinityScore: null, waitingCount: waitingQueue.size });
    return;
  }

  const user = users[0];

  let bestMatchId: string | null = null;
  let bestScore = -1;

  for (const [queuedUserId] of waitingQueue) {
    if (queuedUserId === userId) continue;
    const partners = await db.select().from(usersTable).where(eq(usersTable.id, queuedUserId)).limit(1);
    if (partners.length === 0) continue;
    const common = user.topics.filter((t) => partners[0].topics.includes(t));
    if (common.length > bestScore) {
      bestScore = common.length;
      bestMatchId = queuedUserId;
    }
  }

  if (bestMatchId) {
    waitingQueue.delete(bestMatchId);

    const partners = await db.select().from(usersTable).where(eq(usersTable.id, bestMatchId)).limit(1);
    const partner = partners[0];
    const common = user.topics.filter((t) => partner.topics.includes(t));

    const newMatchId = randomUUID();
    await db.insert(matchesTable).values({
      id: newMatchId,
      user1Id: userId,
      user2Id: bestMatchId,
      commonTopics: common,
      affinityScore: common.length,
      status: "active",
    });

    res.json({
      status: "matched",
      matchId: newMatchId,
      partnerId: bestMatchId,
      partnerNickname: partner.nickname,
      partnerGender: partner.gender,
      partnerTopics: partner.topics,
      commonTopics: common,
      affinityScore: common.length,
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

router.post("/:matchId/end", async (req, res) => {
  const paramsParsed = EndMatchParams.safeParse(req.params);
  const bodyParsed = EndMatchBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { matchId } = paramsParsed.data;
  const { userId } = bodyParsed.data;

  await db
    .update(matchesTable)
    .set({ status: "ended", endedAt: new Date() })
    .where(eq(matchesTable.id, matchId));

  waitingQueue.delete(userId);

  res.json({ message: "Match ended" });
});

export default router;
