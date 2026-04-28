import { Router } from "express";
import { db, usersTable, messagesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { waitingQueue } from "./queue.js";

const router = Router();

router.get("/topics", async (req, res) => {
  const users = await db.select({ topics: usersTable.topics }).from(usersTable);

  const topicCounts: Record<string, number> = {};
  for (const user of users) {
    for (const topic of user.topics) {
      topicCounts[topic] = (topicCounts[topic] ?? 0) + 1;
    }
  }

  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  res.json({
    onlineCount: users.length,
    waitingCount: waitingQueue.size,
    topTopics,
  });
});

export default router;
