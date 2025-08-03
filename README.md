# سیستم مدیریت دسترسی سلسله مراتبی بوکمارک‌ها

## مشکل اصلی
در سیستم قبلی، مدیریت دسترسی بوکمارک‌ها فقط بر اساس مقایسه نام کاربری انجام می‌شد که برای سناریوهای پیچیده کافی نبود:

- وقتی کاربری بوکمارک ایجاد می‌کرد و بعداً خودش وارد آن می‌شد، هیچ محدودیتی نداشت
- اما وقتی همان کاربر می‌خواست برای دیگران بوکمارک ایجاد کند، محدودیت‌های جدید باید به محدودیت‌های قبلی اضافه می‌شد
- سیستم قدیمی قابلیت ارث‌بری محدودیت‌ها را نداشت

## راه‌حل ارائه شده

### 1. کلاس `BookmarkAccessManager`
این کلاس مسئول مدیریت کامل دسترسی‌ها است:

```javascript
const accessManager = new BookmarkAccessManager();
```

### 2. ویژگی‌های کلیدی

#### الف) شناسایی سازنده اصلی
- `originalCreator`: کسی که بوکمارک را در ابتدا ایجاد کرده
- `currentAccessor`: کاربر فعلی که دسترسی دارد

#### ب) ساختار سلسله مراتبی
- `parentBookmarkId`: شناسه بوکمارک والد
- `creationLevel`: سطح ایجاد (0 برای بوکمارک اصلی)

#### ج) ارث‌بری محدودیت‌ها
- محدودیت‌های والد به فرزندان منتقل می‌شود
- محدودیت‌های جدید به قبلی‌ها اضافه می‌شود
- محدودترین مقدار انتخاب می‌شود

### 3. قوانین دسترسی

#### حالت 1: سازنده اصلی بدون والد
```javascript
if (isOriginalCreator && !parentBookmarkId) {
    // هیچ محدودیتی ندارد
    return { shouldApplyRestrictions: false };
}
```

#### حالت 2: سازنده اصلی با والد
```javascript
if (isOriginalCreator && parentBookmarkId) {
    // فقط محدودیت‌های والد اعمال می‌شود
    return getParentRestrictions();
}
```

#### حالت 3: کاربر عادی
```javascript
// تمام محدودیت‌ها اعمال می‌شود
return {
    shouldApplyRestrictions: true,
    filters: this.bookmarkData.filters,
    restrictionsData: this.bookmarkData.restrictionsData
};
```

## نحوه استفاده

### 1. راه‌اندازی اولیه
```javascript
// در فایل اصلی
const accessManager = new BookmarkAccessManager();

// بارگذاری داده‌های بوکمارک
await accessManager.loadBookmarkData();

// بررسی محدودیت‌های قابل اعمال
const restrictions = accessManager.determineRestrictionsToApply();

if (restrictions.shouldApplyRestrictions) {
    // اعمال محدودیت‌ها
    restrictions.filters.forEach(filter => disableElements(filter));
}
```

### 2. ایجاد بوکمارک جدید
```javascript
// محدودیت‌های جدید
const newRestrictions = {
    filters: ['newFilter1', 'newFilter2'],
    restrictionsData: JSON.stringify({
        maxAmount: 500000,
        allowedBranches: ['001']
    })
};

// ایجاد بوکمارک برای کاربر مشخص
const result = await createBookmarkForUser('targetUser', newRestrictions);
```

### 3. بررسی وضعیت دسترسی
```javascript
await accessManager.loadBookmarkData();
const restrictions = accessManager.determineRestrictionsToApply();

console.log('آیا محدودیت دارد؟', restrictions.shouldApplyRestrictions);
console.log('فیلترهای محدود:', restrictions.filters);
```

## ساختار دیتابیس

### جدول اصلی: `BookmarkAccessControl`
```sql
CREATE TABLE BookmarkAccessControl (
    BookmarkId NVARCHAR(50) PRIMARY KEY,
    OriginalCreator NVARCHAR(100) NOT NULL,
    CurrentAccessor NVARCHAR(100),
    ParentBookmarkId NVARCHAR(50),
    CreationLevel INT DEFAULT 0,
    Columns NTEXT,
    Filters NTEXT,
    RestrictionsData NTEXT,
    CreatedDate DATETIME DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);
```

### Stored Procedure: `sp_CreateBookmarkWithInheritance`
```sql
EXEC sp_CreateBookmarkWithInheritance 
    @NewBookmarkId = 'BOOK003',
    @OriginalCreator = 'user1',
    @CurrentAccessor = 'user2',
    @ParentBookmarkId = 'BOOK001',
    @NewFilters = 'filter3,filter4',
    @NewRestrictionsData = '{"maxAmount": 500000}';
```

## سناریوهای عملی

### سناریو 1: ایجاد بوکمارک اصلی
1. ادمین بوکمارک `BOOK001` را ایجاد می‌کند
2. هیچ محدودیتی ندارد
3. می‌تواند برای دیگران بوکمارک ایجاد کند

### سناریو 2: کاربر عادی وارد بوکمارک می‌شود
1. `user1` وارد `BOOK001` می‌شود
2. محدودیت‌های تعریف شده اعمال می‌شود
3. نمی‌تواند تنظیمات محدود شده را تغییر دهد

### سناریو 3: ایجاد بوکمارک فرعی
1. `user1` در `BOOK001` برای `user2` بوکمارک `BOOK002` می‌سازد
2. محدودیت‌های `BOOK001` + محدودیت‌های جدید = محدودیت‌های `BOOK002`
3. `user2` تمام محدودیت‌های ترکیبی را دارد
4. `user1` فقط محدودیت‌های اصلی `BOOK001` را دارد

### سناریو 4: ایجاد بوکمارک سطح سوم
1. `user2` در `BOOK002` برای `user3` بوکمارک `BOOK003` می‌سازد
2. محدودیت‌های `BOOK001` + `BOOK002` + جدید = محدودیت‌های `BOOK003`
3. سلسله مراتب: `BOOK001` → `BOOK002` → `BOOK003`

## مزایای سیستم جدید

### 1. مدیریت سلسله مراتبی
- پشتیبانی از چندین سطح بوکمارک
- ردیابی والد و فرزندان
- حفظ ساختار درختی

### 2. ارث‌بری هوشمند
- انتقال خودکار محدودیت‌ها
- ترکیب محدودیت‌های جدید و قدیمی
- انتخاب محدودترین مقدار

### 3. مدیریت دسترسی دقیق
- تشخیص سازنده اصلی
- اعمال محدودیت‌های مناسب
- حفظ امنیت در تمام سطوح

### 4. قابلیت توسعه
- امکان اضافه کردن قوانین جدید
- پشتیبانی از انواع مختلف محدودیت
- سازگاری با سیستم قدیمی

## فایل‌های سیستم

1. **`bookmark-access-manager.js`**: کلاس اصلی مدیریت دسترسی
2. **`bookmark_management_schema.sql`**: ساختار دیتابیس
3. **`usage-example.js`**: مثال‌های استفاده
4. **`README.md`**: مستندات کامل

## نکات مهم

### امنیت
- تمام عملیات در سمت سرور تأیید می‌شود
- محدودیت‌ها قابل دور زدن نیستند
- تاریخچه تمام تغییرات ثبت می‌شود

### عملکرد
- استفاده از ایندکس‌های مناسب
- کش کردن داده‌های پرکاربرد
- بهینه‌سازی کوئری‌های پیچیده

### سازگاری
- حفظ API قدیمی
- انتقال تدریجی به سیستم جدید
- پشتیبانی از داده‌های موجود

## نصب و راه‌اندازی

### 1. ایجاد جداول
```sql
-- اجرای فایل bookmark_management_schema.sql
```

### 2. اضافه کردن فایل‌های JavaScript
```html
<script src="bookmark-access-manager.js"></script>
<script src="usage-example.js"></script>
```

### 3. مقداردهی اولیه
```javascript
// در کد اصلی
document.addEventListener('DOMContentLoaded', function() {
    window.BookmarkExamples.initializeSystem();
});
```

## پشتیبانی و توسعه

برای سوالات و پیشنهادات، لطفاً با تیم توسعه تماس بگیرید.

### تغییرات آینده
- [ ] پشتیبانی از گروه‌های کاربری
- [ ] مدیریت دسترسی بر اساس زمان
- [ ] رابط کاربری مدیریت بوکمارک‌ها
- [ ] گزارش‌گیری پیشرفته

---

**نسخه:** 1.0.0  
**تاریخ آخرین بروزرسانی:** [تاریخ فعلی]  
**سازگار با:** Dundas BI, SQL Server 2016+
