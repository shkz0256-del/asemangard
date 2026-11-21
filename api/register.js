import { handler, body, clean, digits, normMobile, validNationalId, hashPassword, makeToken, readJson, writeJson, throttle, fail, publicUser } from "../lib/core.js";

export default handler(["POST"], async (req, res) => {
  throttle(req, "register", 10, 10 * 60 * 1000);
  const b = body(req), f = {};
  const firstName = clean(b.firstName, 40), lastName = clean(b.lastName, 60), address = clean(b.address, 300);
  const mobile = normMobile(b.mobile);
  const idType = b.idType === "passport" ? "passport" : "national";
  const idNumber = idType === "passport" ? clean(b.idNumber, 20).toUpperCase() : digits(b.idNumber).replace(/\s/g, "");
  const password = String(b.password ?? "");
  if (firstName.length < 2) f.firstName = "نام را وارد کنید.";
  if (lastName.length < 2) f.lastName = "نام خانوادگی را وارد کنید.";
  if (!mobile) f.mobile = "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷).";
  if (address.length < 10) f.address = "آدرس را کامل وارد کنید.";
  if (idType === "national" ? !validNationalId(idNumber) : !/^[A-Z0-9]{6,12}$/.test(idNumber))
    f.idNumber = idType === "national" ? "کد ملی معتبر نیست." : "شماره پاسپورت معتبر نیست.";
  if (password.length < 8 || password.length > 100) f.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  if (Object.keys(f).length) throw fail(422, "validation", "اطلاعات واردشده معتبر نیست.", f);

  const user = { firstName, lastName, mobile, idType, idNumber, address, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
  try { await writeJson(`users/${mobile}.json`, user, { overwrite: false }); }
  catch (e) { if (e.status === 409) throw fail(409, "exists", "با این شماره موبایل قبلا ثبت‌نام شده است؛ وارد شوید."); throw e; }
  res.status(201).json({ token: makeToken(mobile), user: publicUser(user) });
});
