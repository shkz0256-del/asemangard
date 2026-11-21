import { handler, body, normMobile, verifyPassword, makeToken, readJson, throttle, fail, publicUser } from "../lib/core.js";

export default handler(["POST"], async (req, res) => {
  throttle(req, "login", 15, 10 * 60 * 1000);
  const b = body(req), mobile = normMobile(b.mobile);
  const user = mobile ? await readJson(`users/${mobile}.json`) : null;
  const ok = user ? await verifyPassword(b.password, user.passwordHash) : (await verifyPassword("x", "s1$00$00"), false);
  if (!ok) throw fail(401, "bad_credentials", "شماره موبایل یا رمز عبور درست نیست.");
  res.status(200).json({ token: makeToken(mobile), user: publicUser(user) });
});
