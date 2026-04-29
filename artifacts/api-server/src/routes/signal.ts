import { Router } from "express";

const router = Router();

interface SignalEntry {
  id: number;
  type: string;
  payload: string;
  fromUserId: string;
  createdAt: number;
}

const signalStore = new Map<string, SignalEntry[]>();
let counter = 0;

router.post("/:matchId/signal", (req, res) => {
  const { matchId } = req.params;
  const { type, payload, fromUserId } = req.body;

  if (!type || !payload || !fromUserId) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }

  if (!signalStore.has(matchId)) {
    signalStore.set(matchId, []);
  }

  const entry: SignalEntry = {
    id: ++counter,
    type,
    payload,
    fromUserId,
    createdAt: Date.now(),
  };

  signalStore.get(matchId)!.push(entry);

  res.json({ id: entry.id });
});

router.get("/:matchId/signal", (req, res) => {
  const { matchId } = req.params;
  const { forUserId, since } = req.query as { forUserId?: string; since?: string };

  const sinceId = since ? parseInt(since, 10) : 0;
  const all = signalStore.get(matchId) ?? [];

  const filtered = all.filter(
    (s) => s.id > sinceId && s.fromUserId !== forUserId
  );

  res.json(filtered);
});

router.delete("/:matchId/signal", (req, res) => {
  const { matchId } = req.params;
  signalStore.delete(matchId);
  res.json({ message: "Cleared" });
});

export default router;
