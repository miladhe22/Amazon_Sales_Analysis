// سیستم کامل مدیریت بوکمارک با کنترل دسترسی
// این سیستم تمام سناریوهای مورد نیاز را پوشش می‌دهد

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
];

// کلاس اصلی مدیریت بوکمارک
class BookmarkManager {
  constructor() {
    this.currentUser = dundas.context.currentSession.accountName;
    this.bookmarkId = sessionStorage.getItem("bookmarkId");
    this.dashboardURL = document.URL;
    this.preLocation = document.referrer;
    this.isRefreshedPage = this.dashboardURL === this.preLocation;
    
    // اطلاعات بوکمارک
    this.bookmarkCreator = null;
    this.bookmarkTargetUser = null;
    this.existingRestrictions = [];
    this.currentUserRestrictions = [];
    this.combinedRestrictions = [];
    
    // سطح دسترسی
    this.accessLevel = null;
    this.canCreateBookmarks = false;
    this.canModifyBookmarks = false;
  }

  // مقداردهی اولیه سیستم
  init() {
    this.loadBookmarkData();
    this.determineAccessLevel();
    this.applyAccessRestrictions();
    this.setupBookmarkCreation();
  }

  // بارگذاری اطلاعات بوکمارک از حافظه
  loadBookmarkData() {
    this.bookmarkCreator = sessionStorage.getItem("bookmarkCreator");
    this.bookmarkTargetUser = sessionStorage.getItem("bookmarkTargetUser");
    
    const existingRestrictions = sessionStorage.getItem("bookmarkExistingRestrictions");
    if (existingRestrictions) {
      this.existingRestrictions = JSON.parse(existingRestrictions);
    }
    
    const currentRestrictions = sessionStorage.getItem("currentUserRestrictions");
    if (currentRestrictions) {
      this.currentUserRestrictions = JSON.parse(currentRestrictions);
    }
  }

  // تعیین سطح دسترسی بر اساس رابطه کاربر با بوکمارک
  determineAccessLevel() {
    if (!this.bookmarkId) {
      this.accessLevel = 'NEW_BOOKMARK';
      this.canCreateBookmarks = true;
      this.canModifyBookmarks = true;
      return;
    }

    if (this.bookmarkCreator === this.currentUser) {
      this.accessLevel = 'OWNER';
      this.canCreateBookmarks = true;
      this.canModifyBookmarks = true;
    } else {
      this.accessLevel = 'VIEWER';
      this.canCreateBookmarks = false;
      this.canModifyBookmarks = false;
    }
  }

  // اعمال محدودیت‌های دسترسی بر اساس سطح دسترسی
  applyAccessRestrictions() {
    switch (this.accessLevel) {
      case 'NEW_BOOKMARK':
        this.handleNewBookmarkScenario();
        break;
      case 'OWNER':
        this.handleOwnerScenario();
        break;
      case 'VIEWER':
        this.handleViewerScenario();
        break;
    }
  }

  // سناریو ۱: ایجاد بوکمارک جدید
  handleNewBookmarkScenario() {
    // کاربر در حال ایجاد بوکمارک جدید است
    // محدودیت‌های کاربر فعلی اعمال می‌شود
    this.applyCurrentUserRestrictions();
    
    // تمام قابلیت‌ها برای خودش فعال است
    this.enableAllFunctionality();
  }

  // سناریو ۲: مالک بوکمارک (سازنده بوکمارک)
  handleOwnerScenario() {
    // مالک دسترسی کامل به بوکمارک خود دارد
    // اما هنگام ایجاد بوکمارک برای دیگران، محدودیت‌های ترکیبی اعمال می‌شود
    this.applyExistingRestrictions();
    this.enableAllFunctionality();
    this.setupRestrictedBookmarkCreation();
  }

  // سناریو ۳: بیننده بوکمارک (کسی که بوکمارک دیگری را باز می‌کند)
  handleViewerScenario() {
    // بیننده دسترسی محدود بر اساس محدودیت‌های سازنده دارد
    this.applyExistingRestrictions();
    this.disableBookmarkCreation();
    this.disableModification();
  }

  // اعمال محدودیت‌های کاربر فعلی
  applyCurrentUserRestrictions() {
    // دریافت محدودیت‌های کاربر فعلی از سیستم
    this.currentUserRestrictions = this.getCurrentUserRestrictions();
    sessionStorage.setItem("currentUserRestrictions", JSON.stringify(this.currentUserRestrictions));
  }

  // اعمال محدودیت‌های موجود از بوکمارک
  applyExistingRestrictions() {
    if (this.existingRestrictions.length > 0) {
      this.existingRestrictions.forEach(restriction => {
        disableElements(restriction);
      });
    }
  }

  // فعال‌سازی تمام قابلیت‌ها برای مالک/سازنده
  enableAllFunctionality() {
    // فعال‌سازی تمام عناصر UI برای دسترسی کامل
    const enableElements = ['bookmarkCreateBtn', 'bookmarkSaveBtn', 'bookmarkEditBtn'];
    enableElements.forEach(elementId => {
      enableElements(elementId);
    });
  }

  // غیرفعال‌سازی ایجاد بوکمارک برای بینندگان
  disableBookmarkCreation() {
    const bookmarkElements = ['bookmarkCreateBtn', 'bookmarkSaveBtn'];
    bookmarkElements.forEach(elementId => {
      disableElements(elementId);
    });
  }

  // غیرفعال‌سازی تغییرات برای بینندگان
  disableModification() {
    const modificationElements = ['bookmarkEditBtn', 'parameterEditBtn'];
    modificationElements.forEach(elementId => {
      disableElements(elementId);
    });
  }

  // راه‌اندازی ایجاد بوکمارک محدود برای مالکان
  setupRestrictedBookmarkCreation() {
    // بازنویسی ایجاد بوکمارک برای شامل کردن محدودیت‌ها
    const originalCreateBookmark = window.createBookmark;
    window.createBookmark = (targetUser) => {
      return this.createBookmarkWithRestrictions(targetUser);
    };
  }

  // ایجاد بوکمارک با محدودیت‌های مناسب
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
    
    // ایجاد داده‌های بوکمارک
    const bookmarkData = {
      creator: this.currentUser,
      targetUser: targetUser,
      restrictions: finalRestrictions,
      originalRestrictions: this.existingRestrictions,
      currentUserRestrictions: this.currentUserRestrictions,
      timestamp: new Date().toISOString(),
      accessLevel: targetUser === this.currentUser ? 'SELF' : 'OTHER'
    };
    
    // ذخیره برای بوکمارک جدید
    sessionStorage.setItem("newBookmarkData", JSON.stringify(bookmarkData));
    
    return bookmarkData;
  }

  // دریافت محدودیت‌های کاربر فعلی از سیستم
  getCurrentUserRestrictions() {
    // این باید بر اساس سیستم مجوز کاربر پیاده‌سازی شود
    // فعلاً آرایه خالی برمی‌گردانیم
    return [];
  }

  // راه‌اندازی سیستم ایجاد بوکمارک
  setupBookmarkCreation() {
    // بازنویسی فرآیند ایجاد بوکمارک
    this.overrideBookmarkCreation();
  }

  // بازنویسی فرآیند ایجاد بوکمارک
  overrideBookmarkCreation() {
    // ذخیره توابع اصلی
    const originalCreateBookmark = window.createBookmark;
    const originalSaveBookmark = window.saveBookmark;
    
    // بازنویسی ایجاد بوکمارک
    window.createBookmark = (targetUser) => {
      return this.handleBookmarkCreation(targetUser);
    };
    
    // بازنویسی ذخیره بوکمارک
    window.saveBookmark = (bookmarkData) => {
      return this.handleBookmarkSaving(bookmarkData);
    };
  }

  // مدیریت ایجاد بوکمارک با محدودیت‌ها
  handleBookmarkCreation(targetUser) {
    let restrictions = [];
    
    // سناریو ۱: ایجاد بوکمارک برای خود
    if (targetUser === this.currentUser) {
      restrictions = this.currentUserRestrictions;
    }
    // سناریو ۲: ایجاد بوکمارک برای دیگران
    else {
      // ترکیب محدودیت‌های موجود با محدودیت‌های کاربر فعلی
      restrictions = [...this.existingRestrictions, ...this.currentUserRestrictions];
    }
    
    return {
      targetUser: targetUser,
      restrictions: restrictions,
      creator: this.currentUser,
      timestamp: new Date().toISOString()
    };
  }

  // مدیریت ذخیره بوکمارک با محدودیت‌ها
  handleBookmarkSaving(bookmarkData) {
    const targetUser = bookmarkData.targetUser;
    
    // اضافه کردن متادیتای محدودیت
    bookmarkData.restrictions = bookmarkData.restrictions || [];
    bookmarkData.creator = this.currentUser;
    bookmarkData.targetUser = targetUser;
    bookmarkData.originalRestrictions = this.existingRestrictions;
    bookmarkData.currentUserRestrictions = this.currentUserRestrictions;
    
    return bookmarkData;
  }
}

// تابع processResults بهبود یافته
function processResults(results) {
    var cellset = results;
    var columns, username, filters, DictFilters;
    var count = cellset.length;

    // پیدا کردن ردیف مطابق بر اساس Guid
    for (var i = 0; i < count; i++) {
        if (cellset[i].members[0].caption == Guid) {
            columns = cellset[i].members[9].caption;
            filters = cellset[i].members[10].caption.split(',');
            username = cellset[i].members[3].caption;
            DictFilters = cellset[i].members[11].caption;
            break;
        }
    }

    // مقداردهی اولیه سیستم بوکمارک بهبود یافته
    const bookmarkManager = new BookmarkManager();
    
    // ذخیره متادیتای بوکمارک
    sessionStorage.setItem("bookmarkCreator", username);
    sessionStorage.setItem("bookmarkExistingRestrictions", JSON.stringify(filters));
    
    // مقداردهی اولیه سیستم
    bookmarkManager.init();

    // به‌روزرسانی نمایش ستون‌ها
    if (columns) {
        countindex = updateColumnVisibility(currentViewName, columns);
        sessionStorage.setItem("countindex", JSON.stringify(countindex));
    }

    // اعمال محدودیت‌های مبتنی بر دسترسی
    if (username != name) {
        // اعمال محدودیت‌های موجود برای بینندگان
        filters.forEach(function(x) {
            disableElements(x);
        });
    }

    sessionStorage.setItem("dictArray", DictFilters);
    var parsedParameters = JSON.parse(DictFilters);
    resetFilters(parsedParameters);
}

// تابع مقداردهی اولیه اصلی
function initializeBookmarkSystem() {
    var bookmarkId = sessionStorage.getItem("bookmarkId");
    if (bookmarkId) {
        sessionStorage.setItem('bookmarkId', bookmarkId);
        localStorage.removeItem('bookmarkId');
    }

    // تعریف متغیرهای اصلی
    var dashboardURL = document.URL;
    var currentViewName = dundas.context.baseViewService.currentView.name;
    var preLocation = document.referrer;
    var Parameter = dundas.context.baseViewService.currentView.control.adapters;
    var lenParameter = Parameter.length;
    var name = dundas.context.currentSession.accountName;
    var Guid = sessionStorage.getItem("bookmarkId");
    var dictGlobal = sessionStorage.getItem("dictDefaultColumns");
    var dictparse = JSON.parse(dictGlobal);

    // بررسی اینکه آیا صفحه رفرش شده است
    if (dashboardURL == preLocation) {
        // غیرفعال‌سازی تعامل روی عناصر خاص
        columns = RestApiTable.control.columns;
        for(var i = 0; i < columns.length; i++) {
            RestApiTable.control.columns[i].isVisible = false;
        }
        
        results = fetchDataFromTable('TableSP').then(function(data) {
            processResults(data);
        });
        
        disableElements('image16');
        disableElements('ImagecheckBox');
        disableElements('image10');
    } else {
        // مدیریت ایجاد بوکمارک جدید
        handleNewBookmarkCreation();
    }
}

// مدیریت ایجاد بوکمارک جدید
function handleNewBookmarkCreation() {
    // تنظیم محدوده تاریخ پیش‌فرض
    setDefaultDateRange();
    
    function RunQuery() {
        countindex = updateColumnVisibility(currentViewName, dictparse[currentViewName]);
        var dict = getParametersDict(ParamsArray);
        
        sessionStorage.setItem("countindex", JSON.stringify(countindex));
        sessionStorage.setItem("dictArray", JSON.stringify(dict));
    }
    
    setTimeout(RunQuery, 3000);
}

// تنظیم محدوده تاریخ پیش‌فرض
function setDefaultDateRange() {
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

    // تنظیم پارامتر FromDate
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

    // تنظیم پارامتر ToDate
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

// تابع بررسی اینکه آیا کاربر می‌تواند بوکمارک را تغییر دهد
function canModifyBookmark() {
    const bookmarkCreator = sessionStorage.getItem("bookmarkCreator");
    const currentUser = dundas.context.currentSession.accountName;
    
    return bookmarkCreator === currentUser;
}

// تابع دریافت محدودیت‌های بوکمارک برای کاربر فعلی
function getBookmarkRestrictionsForUser() {
    const bookmarkCreator = sessionStorage.getItem("bookmarkCreator");
    const currentUser = dundas.context.currentSession.accountName;
    const existingRestrictions = sessionStorage.getItem("bookmarkExistingRestrictions");
    
    if (bookmarkCreator === currentUser) {
        // مالک می‌تواند تمام محدودیت‌ها را ببیند اما می‌تواند تغییر دهد
        return existingRestrictions ? JSON.parse(existingRestrictions) : [];
    } else {
        // بیننده محدودیت‌ها را می‌بیند اما نمی‌تواند تغییر دهد
        return existingRestrictions ? JSON.parse(existingRestrictions) : [];
    }
}

// مقداردهی اولیه سیستم هنگام بارگذاری صفحه
document.addEventListener('DOMContentLoaded', function() {
    initializeBookmarkSystem();
});