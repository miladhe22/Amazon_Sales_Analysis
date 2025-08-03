const ParamsArray = [
  "CheckboxDate" ,  "DropDowncustomerno" , "DropDownacctno"
  ,"SENDERBRANCH","ParamSENDERBRANCH",
  "ParamFromDate" , "FromDate" , "ParamToDate" , "ToDate",
  "ParamFromAmount","FromAmount","ParamToAmount","ToAmount" ,
  "ParamsysType","sysType" ,
  "ParamSenderReceiver" ,"SenderReceiver",
  "ParamCustomerType" ,"CustomerType",
  "ParamAccTypeCode","AccTypeCode" ,
  "Branchid","ParamBranchid",
  "Paramcustomerno", "customerno" ,
  "Paramacctno","acctno",
  "ParamIban","Iban",
  "ParamSenderIban" ,"SenderIban",
  "Paramnationalid","nationalid"
]

// Bookmark access management system
class BookmarkAccessManager {
    constructor() {
        this.currentUser = dundas.context.currentSession.accountName;
        this.bookmarkId = this.getBookmarkId();
        this.bookmarkData = null;
    }

    getBookmarkId() {
        var bookmarkId = localStorage.getItem("bookmarkId");
        if (bookmarkId) {
            sessionStorage.setItem('bookmarkId', bookmarkId);
            localStorage.removeItem('bookmarkId');
        }
        return sessionStorage.getItem("bookmarkId");
    }

    // دریافت اطلاعات بوکمارک شامل سازنده اصلی و محدودیت‌ها
    async loadBookmarkData() {
        if (!this.bookmarkId) return null;
        
        try {
            const results = await fetchDataFromTable('TableSP');
            const cellset = results;
            const count = cellset.length;

            for (var i = 0; i < count; i++) {
                if (cellset[i].members[0].caption == this.bookmarkId) {
                    this.bookmarkData = {
                        bookmarkId: this.bookmarkId,
                        columns: cellset[i].members[9].caption,
                        filters: cellset[i].members[10].caption.split(','),
                        originalCreator: cellset[i].members[3].caption, // سازنده اصلی بوکمارک
                        currentAccessor: cellset[i].members[12] ? cellset[i].members[12].caption : null, // کاربر فعلی که دسترسی دارد
                        restrictionsData: cellset[i].members[11].caption,
                        parentBookmarkId: cellset[i].members[13] ? cellset[i].members[13].caption : null, // بوکمارک والد
                        creationLevel: cellset[i].members[14] ? parseInt(cellset[i].members[14].caption) : 0 // سطح ایجاد
                    };
                    break;
                }
            }
            return this.bookmarkData;
        } catch (error) {
            console.error('Error loading bookmark data:', error);
            return null;
        }
    }

    // تعیین محدودیت‌هایی که باید اعمال شود
    determineRestrictionsToApply() {
        if (!this.bookmarkData) return { shouldApplyRestrictions: false, filters: [], restrictionsData: null };

        const isOriginalCreator = this.bookmarkData.originalCreator === this.currentUser;
        const isDirectAccessor = this.bookmarkData.currentAccessor === this.currentUser;

        // اگر کاربر سازنده اصلی بوکمارک است، هیچ محدودیتی ندارد
        if (isOriginalCreator && !this.bookmarkData.parentBookmarkId) {
            return { shouldApplyRestrictions: false, filters: [], restrictionsData: null };
        }

        // اگر کاربر سازنده اصلی است اما بوکمارک والد دارد، فقط محدودیت‌های والد اعمال می‌شود
        if (isOriginalCreator && this.bookmarkData.parentBookmarkId) {
            return this.getParentRestrictions();
        }

        // برای سایر کاربران، تمام محدودیت‌ها اعمال می‌شود
        return {
            shouldApplyRestrictions: true,
            filters: this.bookmarkData.filters,
            restrictionsData: this.bookmarkData.restrictionsData
        };
    }

    // دریافت محدودیت‌های بوکمارک والد
    async getParentRestrictions() {
        if (!this.bookmarkData.parentBookmarkId) {
            return { shouldApplyRestrictions: false, filters: [], restrictionsData: null };
        }

        try {
            const results = await fetchDataFromTable('TableSP');
            const cellset = results;
            const count = cellset.length;

            for (var i = 0; i < count; i++) {
                if (cellset[i].members[0].caption == this.bookmarkData.parentBookmarkId) {
                    return {
                        shouldApplyRestrictions: true,
                        filters: cellset[i].members[10].caption.split(','),
                        restrictionsData: cellset[i].members[11].caption
                    };
                }
            }
        } catch (error) {
            console.error('Error loading parent restrictions:', error);
        }

        return { shouldApplyRestrictions: false, filters: [], restrictionsData: null };
    }

    // ایجاد بوکمارک جدید با ارث‌بری محدودیت‌ها
    async createNewBookmark(targetUser, newRestrictions) {
        const currentRestrictions = this.determineRestrictionsToApply();
        
        // ترکیب محدودیت‌های فعلی با محدودیت‌های جدید
        const inheritedFilters = currentRestrictions.shouldApplyRestrictions ? 
            [...currentRestrictions.filters, ...newRestrictions.filters] : 
            newRestrictions.filters;

        const inheritedRestrictionsData = this.mergeRestrictionsData(
            currentRestrictions.restrictionsData,
            newRestrictions.restrictionsData
        );

        const newBookmarkData = {
            originalCreator: this.currentUser,
            currentAccessor: targetUser,
            filters: inheritedFilters,
            restrictionsData: inheritedRestrictionsData,
            parentBookmarkId: this.bookmarkId,
            creationLevel: (this.bookmarkData?.creationLevel || 0) + 1
        };

        // ذخیره بوکمارک جدید در دیتابیس
        return await this.saveBookmarkToDatabase(newBookmarkData);
    }

    // ترکیب داده‌های محدودیت
    mergeRestrictionsData(parentData, newData) {
        try {
            const parent = parentData ? JSON.parse(parentData) : {};
            const newRestrictions = newData ? JSON.parse(newData) : {};
            
            // ترکیب محدودیت‌ها
            const merged = { ...parent };
            Object.keys(newRestrictions).forEach(key => {
                if (merged[key]) {
                    // اگر کلید موجود است، محدودترین مقدار را انتخاب کن
                    merged[key] = this.selectMostRestrictive(merged[key], newRestrictions[key]);
                } else {
                    merged[key] = newRestrictions[key];
                }
            });

            return JSON.stringify(merged);
        } catch (error) {
            console.error('Error merging restrictions data:', error);
            return newData || parentData || '{}';
        }
    }

    // انتخاب محدودترین مقدار
    selectMostRestrictive(existing, newValue) {
        // منطق انتخاب بر اساس نوع داده
        if (Array.isArray(existing) && Array.isArray(newValue)) {
            // برای آرایه‌ها، اشتراک را بگیر
            return existing.filter(item => newValue.includes(item));
        } else if (typeof existing === 'number' && typeof newValue === 'number') {
            // برای اعداد، کمترین مقدار
            return Math.min(existing, newValue);
        } else {
            // برای سایر موارد، مقدار جدید را بپذیر
            return newValue;
        }
    }

    // ذخیره بوکمارک در دیتابیس
    async saveBookmarkToDatabase(bookmarkData) {
        // این تابع باید با API دیتابیس شما ارتباط برقرار کند
        // فعلاً فقط یک نمونه است
        try {
            // کد ذخیره در دیتابیس
            console.log('Saving bookmark:', bookmarkData);
            return true;
        } catch (error) {
            console.error('Error saving bookmark:', error);
            return false;
        }
    }
}

// Initialize the access manager
const accessManager = new BookmarkAccessManager();

// Define main variables
var dashboardURL = document.URL;
var currentViewName = dundas.context.baseViewService.currentView.name;
var preLocation = document.referrer;
var Parameter = dundas.context.baseViewService.currentView.control.adapters;
var lenParameter = Parameter.length;
var name = dundas.context.currentSession.accountName;
var Guid = sessionStorage.getItem("bookmarkId");
var dictGlobal = sessionStorage.getItem("dictDefaultColumns");
var dictparse = JSON.parse(dictGlobal);

// Main execution logic
if (dashboardURL == preLocation) {
    // حالت بازگشت به همان صفحه (رفرش یا بوکمارک)
    columns = RestApiTable.control.columns;
    for(var i = 0; i < columns.length; i++){
        RestApiTable.control.columns[i].isVisible = false;
    }
    
    // بارگذاری داده‌های بوکمارک و اعمال محدودیت‌ها
    accessManager.loadBookmarkData().then(function(bookmarkData) {
        if (bookmarkData) {
            processResultsWithAccessControl(bookmarkData);
        } else {
            // اگر داده‌ای یافت نشد، روش قدیمی را اجرا کن
            fetchDataFromTable('TableSP').then(function(data) {
                processResults(data);
            });
        }
    });
    
    disableElements('image16');
    disableElements('ImagecheckBox');
    disableElements('image10');
} else {
    // حالت ورود جدید به صفحه
    initializeDateParameters();
    setTimeout(RunQuery, 3000);
}

// تابع پردازش نتایج با کنترل دسترسی
function processResultsWithAccessControl(bookmarkData) {
    const restrictions = accessManager.determineRestrictionsToApply();
    
    // اعمال تنظیمات ستون‌ها
    if (bookmarkData.columns) {
        countindex = updateColumnVisibility(currentViewName, bookmarkData.columns);
        sessionStorage.setItem("countindex", JSON.stringify(countindex));
    }
    
    // اعمال محدودیت‌ها
    if (restrictions.shouldApplyRestrictions) {
        restrictions.filters.forEach(function(x) {
            disableElements(x);
        });
        
        sessionStorage.setItem("dictArray", restrictions.restrictionsData);
        var parsedParameters = JSON.parse(restrictions.restrictionsData);
        resetFilters(parsedParameters);
    } else {
        // اگر محدودیتی نیست، داده‌های اصلی را بارگذاری کن
        sessionStorage.setItem("dictArray", bookmarkData.restrictionsData);
        if (bookmarkData.restrictionsData) {
            var parsedParameters = JSON.parse(bookmarkData.restrictionsData);
            resetFilters(parsedParameters);
        }
    }
}

// Function to process results from data retrieval (تابع قدیمی - برای سازگاری)
function processResults(results) {
    var cellset = results;
    var columns, username, filters, DictFilters;
    var count = cellset.length;

    // Find matching row based on Guid
    for (var i = 0; i < count; i++) {
        if (cellset[i].members[0].caption == Guid) {
            columns = cellset[i].members[9].caption;
            filters = cellset[i].members[10].caption.split(',');
            username = cellset[i].members[3].caption;
            DictFilters = cellset[i].members[11].caption;
            break;
        }
    }
    
    // Update column visibility
    if (columns) {
        countindex = updateColumnVisibility(currentViewName, columns);
        sessionStorage.setItem("countindex", JSON.stringify(countindex));
    }
    
    // If username mismatch, apply filters
    if (username != name) {
        filters.forEach(function(x) { disableElements(x) });
    }
    
    sessionStorage.setItem("dictArray", DictFilters);
    var parsedParameters = JSON.parse(DictFilters);
    resetFilters(parsedParameters);
}

// تابع مقداردهی اولیه پارامترهای تاریخ
function initializeDateParameters() {
    var today = new Date().toLocaleDateString('fa-IR-u-nu-latn');
    var Year = today.split('/')[0].toString();
    var Month = today.split('/')[1].toString();
    var Day = today.split('/')[2].toString();

    var LenMonth = Month.length;
    var LenDay = Day.length;

    if (LenMonth == 1) {
        Month = '0' + Month.toString();
    }

    if (LenDay == 1) {
        Day = '0' + Day.toString();
    }

    var DateFromDate = Year + '/' + Month + '/' + '01';
    var DateToDate = Year + '/' + Month + '/' + Day;

    // Set FromDate parameter
    var viewParameter_FromDate = dundas.context.baseViewViewService.currentView.control.viewParameters.filter(function(item) {
        return item.name === "FromDate";
    })[0];

    var filterValueFromDate = new dundas.data.MemberValue({
        hierarchyUniqueName: "sDate",
        levelUniqueName: "B.sDate",
        uniqueName: DateFromDate + ".B.sDate"
    });

    viewParameter_FromDate.parameterValue.token = null;
    viewParameter_FromDate.parameterValue.values.length = 0;
    viewParameter_FromDate.parameterValue.values.push(filterValueFromDate);
    viewParameter_FromDate.invalidateParameterValueLastModifiedTime();
    viewParameter_FromDate.refreshAllAdapters(null, this.parentView);

    // Set ToDate parameter
    var viewParameter_ToDate = dundas.context.baseViewViewService.currentView.control.viewParameters.filter(function(item) {
        return item.name === "ToDate";
    })[0];

    var filterValueToDate = new dundas.data.MemberValue({
        hierarchyUniqueName: "sDate",
        levelUniqueName: "B.sDate",
        uniqueName: DateToDate + ".B.sDate"
    });

    viewParameter_ToDate.parameterValue.token = null;
    viewParameter_ToDate.parameterValue.values.length = 0;
    viewParameter_ToDate.parameterValue.values.push(filterValueToDate);
    viewParameter_ToDate.invalidateParameterValueLastModifiedTime();
    viewParameter_ToDate.refreshAllAdapters(null, this.parentView);

    ParamFromDate.control.value = parseInt(DateFromDate.replaceAll('/', ''));
    ParamToDate.control.value = parseInt(DateToDate.replaceAll('/', ''));
}

function RunQuery() {
    countindex = updateColumnVisibility(currentViewName, dictparse[currentViewName]);
    var dict = getParametersDict(ParamsArray);

    sessionStorage.setItem("countindex", JSON.stringify(countindex));
    sessionStorage.setItem("dictArray", JSON.stringify(dict));
}

// تابع کمکی برای ایجاد بوکمارک جدید
function createBookmarkForUser(targetUser, additionalRestrictions) {
    return accessManager.createNewBookmark(targetUser, additionalRestrictions);
}

// Export access manager for external use
window.bookmarkAccessManager = accessManager;