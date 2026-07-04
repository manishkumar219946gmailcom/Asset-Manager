import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, loginHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin, generateToken, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "bad_request", message: "Username and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid username or password" });
    return;
  }
  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));
  await db.insert(loginHistoryTable).values({
    userId: user.id,
    username: user.username,
    action: "login",
    ip: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  const token = generateToken({ id: user.id, username: user.username, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt, lastLogin: new Date() } });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
  if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt, lastLogin: user.lastLogin });
});

router.post("/auth/logout", requireAuth, async (req: AuthRequest, res) => {
  await db.insert(loginHistoryTable).values({
    userId: req.user!.id,
    username: req.user!.username,
    action: "logout",
    ip: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/users", requireAdmin, async (_req, res) => {
  const users = await db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt, lastLogin: usersTable.lastLogin }).from(usersTable).orderBy(usersTable.createdAt);
  res.json(users);
});

router.post("/auth/users", requireAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    res.status(400).json({ error: "bad_request", message: "All fields required" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({ username, email, passwordHash, role }).returning({ id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt, lastLogin: usersTable.lastLogin });
  res.status(201).json(user);
});

export default router;
