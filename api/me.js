import { handler, authMobile, readJson, fail, publicUser } from "../lib/core.js";

export default handler(["GET"], async (req, res) => {
  const mobile = authMobile(req);
  const user = await readJson(`users/${mobile}.json`);
  if (!user) throw fail(401, "no_user", "حساب پیدا نشد؛ دوباره وارد شوید.");
  res.status(200).json({ user: publicUser(user) });
});
