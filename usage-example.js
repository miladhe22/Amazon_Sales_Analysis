// مثال‌های استفاده از سیستم مدیریت دسترسی بوکمارک

// 1. نحوه ایجاد بوکمارک جدید برای کاربر دیگر
async function createBookmarkExample() {
    // محدودیت‌های جدید که می‌خواهیم اضافه کنیم
    const newRestrictions = {
        filters: ['newFilter1', 'newFilter2'],
        restrictionsData: JSON.stringify({
            maxAmount: 500000,
            allowedBranches: ['001'],
            restrictedTimeRange: '09:00-17:00'
        })
    };
    
    // ایجاد بوکمارک برای کاربر مشخص
    const result = await createBookmarkForUser('targetUser123', newRestrictions);
    
    if (result) {
        console.log('بوکمارک با موفقیت ایجاد شد');
    } else {
        console.error('خطا در ایجاد بوکمارک');
    }
}

// 2. بررسی وضعیت دسترسی کاربر فعلی
async function checkCurrentUserAccess() {
    await accessManager.loadBookmarkData();
    const restrictions = accessManager.determineRestrictionsToApply();
    
    console.log('وضعیت دسترسی کاربر فعلی:');
    console.log('- آیا محدودیت دارد؟', restrictions.shouldApplyRestrictions);
    console.log('- فیلترهای محدود:', restrictions.filters);
    console.log('- داده‌های محدودیت:', restrictions.restrictionsData);
}

// 3. سناریو کامل: کاربر A بوکمارک می‌سازد، کاربر B وارد می‌شود و بوکمارک جدید می‌سازد
async function completeScenarioExample() {
    console.log('=== سناریو کامل ===');
    
    // فرض: کاربر A (admin) بوکمارک اصلی ایجاد کرده
    console.log('1. کاربر A (admin) بوکمارک اصلی BOOK001 را ایجاد کرده');
    
    // کاربر B (user1) وارد بوکمارک می‌شود
    console.log('2. کاربر B (user1) وارد بوکمارک BOOK001 می‌شود');
    
    // بررسی محدودیت‌های کاربر B
    const userBRestrictions = {
        shouldApplyRestrictions: true, // چون سازنده نیست
        filters: ['filter1', 'filter2'],
        restrictionsData: '{"maxAmount": 1000000}'
    };
    
    console.log('3. محدودیت‌های کاربر B:', userBRestrictions);
    
    // کاربر B می‌خواهد برای کاربر C بوکمارک ایجاد کند
    console.log('4. کاربر B برای کاربر C بوکمارک جدید ایجاد می‌کند');
    
    const newRestrictionsForC = {
        filters: ['filter3'], // محدودیت جدید
        restrictionsData: JSON.stringify({
            maxAmount: 500000, // محدودتر از قبل
            restrictedDays: ['Friday'] // محدودیت جدید
        })
    };
    
    // محدودیت‌های نهایی برای کاربر C شامل:
    // - محدودیت‌های اصلی (filter1, filter2, maxAmount: 1000000)
    // - محدودیت‌های جدید (filter3, maxAmount: 500000, restrictedDays)
    // نتیجه نهایی: filter1, filter2, filter3 + maxAmount: 500000 (کمترین مقدار)
    
    console.log('5. محدودیت‌های نهایی کاربر C:');
    console.log('   - فیلترها: filter1, filter2, filter3');
    console.log('   - حداکثر مبلغ: 500000 (کمترین مقدار)');
    console.log('   - روزهای محدود: Friday');
}

// 4. تابع کمکی برای نمایش ساختار سلسله مراتبی بوکمارک‌ها
function displayBookmarkHierarchy(bookmarkData) {
    console.log('=== ساختار سلسله مراتبی بوکمارک ===');
    console.log(`بوکمارک: ${bookmarkData.bookmarkId}`);
    console.log(`سازنده اصلی: ${bookmarkData.originalCreator}`);
    console.log(`کاربر فعلی: ${bookmarkData.currentAccessor || 'عمومی'}`);
    console.log(`بوکمارک والد: ${bookmarkData.parentBookmarkId || 'ندارد'}`);
    console.log(`سطح ایجاد: ${bookmarkData.creationLevel}`);
    console.log('---');
}

// 5. مدیریت خطاها و وضعیت‌های خاص
async function handleSpecialCases() {
    try {
        // حالت 1: کاربر سازنده اصلی بوکمارک است
        if (accessManager.bookmarkData?.originalCreator === accessManager.currentUser && 
            !accessManager.bookmarkData?.parentBookmarkId) {
            console.log('کاربر سازنده اصلی است - بدون محدودیت');
            return;
        }
        
        // حالت 2: کاربر سازنده است اما بوکمارک والد دارد
        if (accessManager.bookmarkData?.originalCreator === accessManager.currentUser && 
            accessManager.bookmarkData?.parentBookmarkId) {
            console.log('کاربر سازنده است اما محدودیت‌های والد اعمال می‌شود');
            const parentRestrictions = await accessManager.getParentRestrictions();
            console.log('محدودیت‌های والد:', parentRestrictions);
            return;
        }
        
        // حالت 3: کاربر عادی
        console.log('کاربر عادی - تمام محدودیت‌ها اعمال می‌شود');
        
    } catch (error) {
        console.error('خطا در پردازش:', error);
    }
}

// 6. تست عملکرد سیستم
async function testSystem() {
    console.log('=== تست سیستم ===');
    
    try {
        // بارگذاری داده‌های بوکمارک
        const bookmarkData = await accessManager.loadBookmarkData();
        
        if (!bookmarkData) {
            console.log('هیچ بوکمارکی یافت نشد');
            return;
        }
        
        // نمایش اطلاعات بوکمارک
        displayBookmarkHierarchy(bookmarkData);
        
        // بررسی محدودیت‌های قابل اعمال
        const restrictions = accessManager.determineRestrictionsToApply();
        console.log('محدودیت‌های قابل اعمال:', restrictions);
        
        // مدیریت حالات خاص
        await handleSpecialCases();
        
    } catch (error) {
        console.error('خطا در تست سیستم:', error);
    }
}

// 7. راه‌اندازی رویدادها برای UI
function setupEventHandlers() {
    // رویداد ایجاد بوکمارک جدید
    document.addEventListener('createBookmark', async function(event) {
        const { targetUser, restrictions } = event.detail;
        
        try {
            const result = await createBookmarkForUser(targetUser, restrictions);
            
            if (result) {
                // نمایش پیام موفقیت
                showNotification('بوکمارک با موفقیت ایجاد شد', 'success');
            } else {
                showNotification('خطا در ایجاد بوکمارک', 'error');
            }
        } catch (error) {
            console.error('خطا در ایجاد بوکمارک:', error);
            showNotification('خطای سیستمی در ایجاد بوکمارک', 'error');
        }
    });
    
    // رویداد بررسی دسترسی
    document.addEventListener('checkAccess', async function(event) {
        await checkCurrentUserAccess();
    });
}

// 8. تابع کمکی برای نمایش اعلان‌ها
function showNotification(message, type = 'info') {
    // پیاده‌سازی نمایش اعلان بر اساس UI شما
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // مثال: اگر از کتابخانه اعلان استفاده می‌کنید
    // toastr[type](message);
}

// 9. مقداردهی اولیه سیستم
async function initializeSystem() {
    try {
        console.log('راه‌اندازی سیستم مدیریت بوکمارک...');
        
        // بارگذاری داده‌های اولیه
        await accessManager.loadBookmarkData();
        
        // راه‌اندازی رویدادها
        setupEventHandlers();
        
        // تست سیستم
        await testSystem();
        
        console.log('سیستم با موفقیت راه‌اندازی شد');
        
    } catch (error) {
        console.error('خطا در راه‌اندازی سیستم:', error);
    }
}

// اجرای مقداردهی اولیه
document.addEventListener('DOMContentLoaded', initializeSystem);

// Export توابع برای استفاده خارجی
window.BookmarkExamples = {
    createBookmarkExample,
    checkCurrentUserAccess,
    completeScenarioExample,
    testSystem,
    initializeSystem
};