import { Router } from "express";
import { randomUUID } from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterUserBody, GetUserParams } from "@workspace/api-zod";

const router = Router();

router.post("/register", async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { nickname, gender, topics } = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.nickname, nickname))
    .limit(1);

  let user;
  if (existing.length > 0) {
    const updated = await db
      .update(usersTable)
      .set({ nickname, gender, topics, updatedAt: new Date() })
      .where(eq(usersTable.id, existing[0].id))
      .returning();
    user = updated[0];
  } else {
    const inserted = await db
      .insert(usersTable)
      .values({ id: randomUUID(), nickname, gender, topics })
      .returning();
    user = inserted[0];
  }

  res.json({
    id: user.id,
    nickname: user.nickname,
    gender: user.gender,
    topics: user.topics,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/:userId", async (req, res) => {
  const parsed = GetUserParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.userId))
    .limit(1);

  if (users.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const user = users[0];
  res.json({
    id: user.id,
    nickname: user.nickname,
    gender: user.gender,
    topics: user.topics,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
