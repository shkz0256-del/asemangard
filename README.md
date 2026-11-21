# آسمان‌گرد — سایت + API

ساختار:
- `public/` سایت (index.html، فریم‌های هیرو، عکس‌ها)
- `api/` و `lib/` بک‌اند (ثبت‌نام، ورود، رزرو) روی Vercel Functions
- `scripts/local-test.mjs` تست محلی بک‌اند (بدون نیاز به اینترنت)

## انتشار (گیت‌هاب + ورسل)
1. این پوشه را در یک ریپوی جدید گیت‌هاب بگذار (`git init`, `git add .`, `git commit`, `git push`).
2. در Vercel: Add New → Project → ریپو را Import کن. تنظیمات پیش‌فرض (Framework: Other) درست است.
3. Storage → Create → **Blob** (حالت Private) بساز و به پروژه وصل کن.
4. Settings → Environment Variables: مقدار `AUTH_SECRET` را یک رشتهٔ تصادفی بلند بگذار (Production).
5. Redeploy. آدرس `/api/health` باید `{"ok":true,"version":2}` بدهد.

سایت و API در همین یک پروژه و یک دامنه هستند. اگر سایت را جای دیگری میزبانی می‌کنی، در `public/index.html` مقدار `API=""` را به آدرس API عوض کن.

## نکته دربارهٔ حساب‌های قبلی
این نسخه داده‌ها را زیر مسیر `v2/` در Blob ذخیره می‌کند. حساب‌هایی که با نسخهٔ قبلی روی `asemangard-api.vercel.app` ساخته شده‌اند به این نسخه منتقل نمی‌شوند.

## تست محلی
```
npm install
node scripts/local-test.mjs
```

## فیلدهای رزرو
`from,to,fromCode,toCode,depart,return,adult,child,infant,cls,ticketType(saver|std|flex),baggage(cabin|20|30),timeSlots[],direct,airlines[],estimateUsd`

قیمت‌ها در سایت تقریبی‌اند (بر پایهٔ نرخ‌های عمومی Skyscanner/Omio و فاصلهٔ مسیر) و فقط برای راهنمایی‌اند؛ نرخ نهایی را کارشناس تایید می‌کند.
