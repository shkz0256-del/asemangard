# راه‌اندازی آسمان‌گرد روی Cloudflare Pages

## ساختار انتشار
- خروجی سایت استاتیک: `public/`
- تنظیمات Pages: `wrangler.jsonc`
- واسط API در Pages Functions: `functions/api/[[path]].js`

## اتصال پروژه
1. در Cloudflare وارد Workers & Pages شوید و یک Pages project از Git بسازید.
2. مخزن `shkz0256-del/asemangard` و شاخه `cloudflare-migration` را انتخاب کنید.
3. Build command را خالی بگذارید.
4. Build output directory را `public` قرار دهید.
5. پروژه را Deploy کنید.

## تنظیم متغیر API
در Settings → Variables and Secrets، متغیر زیر را در Production تعریف کنید:

- Name: `ASMAN_API_ORIGIN`
- Value: آدرس دامنهٔ پروژهٔ API فعلی Vercel، بدون اسلش انتهایی.

اگر این متغیر تعریف نشود، واسط از مقدار پیش‌فرض `https://asemangard.vercel.app` استفاده می‌کند.

## نکتهٔ مهم دربارهٔ داده‌ها
این انتشار فقط رابط سایت را روی Cloudflare میزبانی می‌کند. ثبت‌نام، ورود، رزروها، توکن‌ها و ذخیره‌سازی همچنان روی API و Vercel Blob فعلی می‌مانند. برای حفظ حساب‌های قبلی، API مقصد باید همان پروژهٔ دارای داده‌های فعلی باشد. قبل از تغییر یا حذف پروژهٔ Vercel، عملکرد API و دسترسی به Blob را بررسی کنید.

## بررسی پس از انتشار
- صفحهٔ اصلی: `/`
- سلامت API از دامنهٔ Pages: `/api/health`
- درخواست‌های ورود، ثبت‌نام و رزرو از همان دامنهٔ Pages و از طریق واسط عبور می‌کنند.

در این شاخه هیچ کلید یا مقدار محرمانه‌ای ثبت نشده است.
