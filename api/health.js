import { handler } from "../lib/core.js";
export default handler(["GET"], async (req, res) => res.status(200).json({ ok: true, version: 2 }));
