# سیستم مدیریت بوکمارک با کنترل دسترسی
# Bookmark Management System with Access Control

## خلاصه مشکل / Problem Summary

مشکل اصلی در سیستم بوکمارک این بود که وقتی کاربر وارد بوکمارک می‌شد و می‌خواست برای خودش یا دیگران بوکمارک جدید ایجاد کند، محدودیت‌های مناسب اعمال نمی‌شد.

The main issue was that when a user accessed a bookmark and wanted to create new bookmarks for themselves or others, proper restrictions were not being applied.

## راه‌حل ارائه شده / Proposed Solution

### سناریوهای پوشش داده شده / Covered Scenarios

#### ۱. ایجاد بوکمارک برای خود / Creating Bookmark for Self
- کاربر محدودیت‌های خودش را دارد
- می‌تواند تمام قابلیت‌ها را استفاده کند
- محدودیت‌های جدید برای خودش اعمال نمی‌شود

#### ۲. ایجاد بوکمارک برای دیگران / Creating Bookmark for Others
- محدودیت‌های موجود + محدودیت‌های کاربر فعلی اعمال می‌شود
- کاربر برای دیگران محدودیت ایجاد می‌کند
- خودش تحت تأثیر محدودیت‌های جدید قرار نمی‌گیرد

#### ۳. دسترسی به بوکمارک دیگران / Accessing Others' Bookmarks
- کاربر محدودیت‌های سازنده بوکمارک را می‌بیند
- نمی‌تواند بوکمارک جدید ایجاد کند
- نمی‌تواند تغییرات اعمال کند

### کلاس‌های اصلی / Main Classes

#### BookmarkManager
کلاس اصلی که تمام منطق کنترل دسترسی را مدیریت می‌کند:

```javascript
class BookmarkManager {
  constructor() {
    this.currentUser = dundas.context.currentSession.accountName;
    this.bookmarkId = sessionStorage.getItem("bookmarkId");
    // ... سایر متغیرها
  }
  
  init() {
    this.loadBookmarkData();
    this.determineAccessLevel();
    this.applyAccessRestrictions();
    this.setupBookmarkCreation();
  }
}
```

#### سطوح دسترسی / Access Levels

1. **NEW_BOOKMARK**: کاربر در حال ایجاد بوکمارک جدید است
2. **OWNER**: مالک بوکمارک (سازنده)
3. **VIEWER**: بیننده بوکمارک (کسی که بوکمارک دیگری را باز می‌کند)

### توابع کلیدی / Key Functions

#### processResults(results)
تابع بهبود یافته که محدودیت‌های دسترسی را اعمال می‌کند:

```javascript
function processResults(results) {
    // ... پردازش داده‌ها
    
    // مقداردهی اولیه سیستم بوکمارک
    const bookmarkManager = new BookmarkManager();
    bookmarkManager.init();
    
    // اعمال محدودیت‌های مبتنی بر دسترسی
    if (username != name) {
        filters.forEach(function(x) {
            disableElements(x);
        });
    }
}
```

#### createBookmarkWithRestrictions(targetUser)
ایجاد بوکمارک با محدودیت‌های مناسب:

```javascript
createBookmarkWithRestrictions(targetUser) {
    let finalRestrictions = [];
    
    // همیشه محدودیت‌های موجود را شامل کن
    if (this.existingRestrictions.length > 0) {
        finalRestrictions = [...this.existingRestrictions];
    }
    
    // اگر برای شخص دیگری ایجاد می‌کند، محدودیت‌های کاربر فعلی را اضافه کن
    if (targetUser !== this.currentUser) {
        finalRestrictions = [...finalRestrictions, ...this.currentUserRestrictions];
    }
    
    return {
        creator: this.currentUser,
        targetUser: targetUser,
        restrictions: finalRestrictions,
        // ... سایر متادیتا
    };
}
```

## نحوه استفاده / How to Use

### ۱. اضافه کردن فایل‌ها / Adding Files
فایل `complete_bookmark_solution.js` را به پروژه اضافه کنید.

### ۲. مقداردهی اولیه / Initialization
سیستم به طور خودکار هنگام بارگذاری صفحه مقداردهی می‌شود:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    initializeBookmarkSystem();
});
```

### ۳. استفاده از توابع کمکی / Using Helper Functions

```javascript
// بررسی اینکه آیا کاربر می‌تواند بوکمارک را تغییر دهد
if (canModifyBookmark()) {
    // اجازه تغییر
}

// دریافت محدودیت‌های بوکمارک برای کاربر فعلی
const restrictions = getBookmarkRestrictionsForUser();
```

## مزایای راه‌حل / Solution Benefits

1. **امنیت بهتر**: کنترل دقیق دسترسی‌ها
2. **انعطاف‌پذیری**: پشتیبانی از تمام سناریوهای مورد نیاز
3. **قابلیت نگهداری**: کد تمیز و قابل فهم
4. **مقیاس‌پذیری**: قابلیت اضافه کردن محدودیت‌های جدید

## نکات مهم / Important Notes

1. تابع `getCurrentUserRestrictions()` باید بر اساس سیستم مجوز کاربر پیاده‌سازی شود
2. تمام محدودیت‌ها در sessionStorage ذخیره می‌شوند
3. سیستم به طور خودکار محدودیت‌های ترکیبی را مدیریت می‌کند

## تست / Testing

برای تست سیستم، سناریوهای زیر را بررسی کنید:

1. ایجاد بوکمارک برای خود
2. ایجاد بوکمارک برای دیگران
3. دسترسی به بوکمارک دیگران
4. ایجاد بوکمارک جدید از داخل بوکمارک موجود

## پشتیبانی / Support

برای سوالات یا مشکلات، لطفاً با تیم توسعه تماس بگیرید.
