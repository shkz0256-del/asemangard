import crypto from "node:crypto";
import { handler, body, authMobile, readJson, readByPathname, writeJson, listPrefix, clean, digits, throttle, fail } from "../lib/core.js";

const CLASSES = ["اکونومی", "پریمیوم اکونومی", "بیزینس", "فرست کلاس"];
const TICKETS = ["saver", "std", "flex"], BAGS = ["cabin", "20", "30"], SLOTS = ["night", "morning", "noon", "evening"];
const AIRLINES = ["TK", "PC", "VF", "EK", "QR", "FZ", "EY", "LH", "AF", "KL", "BA", "W5", "IR"];
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d + "T00:00:00Z"));
const pick = (arr, allowed) => [...new Set((Array.isArray(arr) ? arr : []).map(String).filter((x) => allowed.includes(x)))];

export default handler(["GET", "POST"], async (req, res) => {
  const mobile = authMobile(req);
  if (!(await readJson(`users/${mobile}.json`))) throw fail(401, "unauthorized", "ابتدا ثبت‌نام کنید.");

  if (req.method === "GET") {
    const { blobs } = await listPrefix(`bookings/${mobile}/`);
    const items = (await Promise.all(blobs.slice(-30).map((b) => readByPathname(b.pathname)))).filter(Boolean)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.status(200).json({ bookings: items });
  }

  throttle(req, "book", 20, 10 * 60 * 1000);
  const b = body(req);
  const trip = b.trip === "oneway" ? "oneway" : "round";
  const from = clean(b.from, 40), to = clean(b.to, 40), depart = clean(b.depart, 10), ret = clean(b.return, 10);
  const fromCode = String(b.fromCode ?? "").toUpperCase(), toCode = String(b.toCode ?? "").toUpperCase();
  const adult = Math.trunc(+digits(b.adult)), child = Math.trunc(+digits(b.child || 0)), infant = Math.trunc(+digits(b.infant || 0));
  if (!from || !to || from === to || (fromCode && !/^[A-Z]{3}$/.test(fromCode)) || (toCode && !/^[A-Z]{3}$/.test(toCode)) || (fromCode && fromCode === toCode))
    throw fail(422, "validation", "مبدا و مقصد معتبر نیست.");
  if (!isDate(depart) || depart < new Date().toISOString().slice(0, 10)) throw fail(422, "validation", "تاریخ رفت معتبر نیست.");
  if (trip === "round" && (!isDate(ret) || ret < depart)) throw fail(422, "validation", "تاریخ برگشت معتبر نیست.");
  if (![adult, child, infant].every(Number.isInteger) || adult < 1 || adult > 9 || child < 0 || child > 6 || infant < 0 || infant > adult)
    throw fail(422, "validation", "تعداد مسافران معتبر نیست.");

  const est = Number(b.estimateUsd);
  const booking = {
    id: crypto.randomBytes(4).toString("hex").toUpperCase(),
    mobile, trip, from, to, fromCode, toCode, depart, return: trip === "round" ? ret : "",
    adult, child, infant,
    cls: CLASSES.includes(b.cls) ? b.cls : CLASSES[0],
    ticketType: TICKETS.includes(b.ticketType) ? b.ticketType : "std",
    baggage: BAGS.includes(String(b.baggage)) ? String(b.baggage) : "20",
    timeSlots: pick(b.timeSlots, SLOTS),
    direct: b.direct === true,
    airlines: pick(b.airlines, AIRLINES),
    estimateUsd: Number.isFinite(est) && est > 0 && est < 100000 ? Math.round(est) : null,
    status: "received",
    createdAt: new Date().toISOString(),
  };
  await writeJson(`bookings/${mobile}/${Date.now()}-${booking.id}.json`, booking);
  res.status(201).json({ booking });
});
