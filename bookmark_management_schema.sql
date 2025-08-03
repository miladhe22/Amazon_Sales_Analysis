-- جدول مدیریت بوکمارک‌ها با قابلیت سلسله مراتبی
CREATE TABLE BookmarkAccessControl (
    BookmarkId NVARCHAR(50) PRIMARY KEY,
    OriginalCreator NVARCHAR(100) NOT NULL, -- سازنده اصلی بوکمارک
    CurrentAccessor NVARCHAR(100), -- کاربر فعلی که دسترسی دارد (NULL برای عمومی)
    ParentBookmarkId NVARCHAR(50), -- شناسه بوکمارک والد
    CreationLevel INT DEFAULT 0, -- سطح ایجاد (0 برای بوکمارک اصلی)
    Columns NTEXT, -- تنظیمات ستون‌ها
    Filters NTEXT, -- فیلترهای غیرفعال شده (جدا شده با کاما)
    RestrictionsData NTEXT, -- داده‌های محدودیت‌ها (JSON format)
    CreatedDate DATETIME DEFAULT GETDATE(),
    ModifiedDate DATETIME DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1,
    
    -- Foreign Key برای ارتباط با بوکمارک والد
    CONSTRAINT FK_BookmarkAccessControl_Parent 
        FOREIGN KEY (ParentBookmarkId) 
        REFERENCES BookmarkAccessControl(BookmarkId)
);

-- ایندکس برای بهبود عملکرد
CREATE INDEX IDX_BookmarkAccessControl_Creator ON BookmarkAccessControl(OriginalCreator);
CREATE INDEX IDX_BookmarkAccessControl_Accessor ON BookmarkAccessControl(CurrentAccessor);
CREATE INDEX IDX_BookmarkAccessControl_Parent ON BookmarkAccessControl(ParentBookmarkId);
CREATE INDEX IDX_BookmarkAccessControl_Level ON BookmarkAccessControl(CreationLevel);

-- جدول تاریخچه تغییرات بوکمارک‌ها
CREATE TABLE BookmarkAccessHistory (
    HistoryId INT IDENTITY(1,1) PRIMARY KEY,
    BookmarkId NVARCHAR(50) NOT NULL,
    ActionType NVARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE, ACCESS
    PerformedBy NVARCHAR(100) NOT NULL,
    ActionDate DATETIME DEFAULT GETDATE(),
    OldValues NTEXT, -- مقادیر قبلی (JSON format)
    NewValues NTEXT, -- مقادیر جدید (JSON format)
    Comments NVARCHAR(500),
    
    CONSTRAINT FK_BookmarkAccessHistory_Bookmark 
        FOREIGN KEY (BookmarkId) 
        REFERENCES BookmarkAccessControl(BookmarkId)
);

-- ایندکس برای جدول تاریخچه
CREATE INDEX IDX_BookmarkAccessHistory_Bookmark ON BookmarkAccessHistory(BookmarkId);
CREATE INDEX IDX_BookmarkAccessHistory_Date ON BookmarkAccessHistory(ActionDate);
CREATE INDEX IDX_BookmarkAccessHistory_User ON BookmarkAccessHistory(PerformedBy);

-- جدول مجوزهای کاربران (اختیاری - برای مدیریت دقیق‌تر دسترسی‌ها)
CREATE TABLE UserPermissions (
    UserId NVARCHAR(100) NOT NULL,
    PermissionType NVARCHAR(50) NOT NULL, -- CREATE_BOOKMARK, MODIFY_BOOKMARK, DELETE_BOOKMARK, etc.
    PermissionLevel NVARCHAR(20) NOT NULL, -- FULL, LIMITED, READ_ONLY
    GrantedBy NVARCHAR(100) NOT NULL,
    GrantedDate DATETIME DEFAULT GETDATE(),
    ExpiryDate DATETIME NULL,
    IsActive BIT DEFAULT 1,
    
    PRIMARY KEY (UserId, PermissionType)
);

-- Stored Procedure برای ایجاد بوکمارک جدید با ارث‌بری محدودیت‌ها
CREATE PROCEDURE sp_CreateBookmarkWithInheritance
    @NewBookmarkId NVARCHAR(50),
    @OriginalCreator NVARCHAR(100),
    @CurrentAccessor NVARCHAR(100) = NULL,
    @ParentBookmarkId NVARCHAR(50) = NULL,
    @Columns NTEXT = NULL,
    @NewFilters NVARCHAR(MAX) = NULL,
    @NewRestrictionsData NTEXT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @InheritedFilters NVARCHAR(MAX) = '';
    DECLARE @InheritedRestrictionsData NTEXT = '{}';
    DECLARE @CreationLevel INT = 0;
    
    -- اگر بوکمارک والد وجود دارد، محدودیت‌ها را ارث‌بری کن
    IF @ParentBookmarkId IS NOT NULL
    BEGIN
        SELECT 
            @InheritedFilters = ISNULL(Filters, ''),
            @InheritedRestrictionsData = ISNULL(RestrictionsData, '{}'),
            @CreationLevel = CreationLevel + 1
        FROM BookmarkAccessControl 
        WHERE BookmarkId = @ParentBookmarkId;
        
        -- ترکیب فیلترهای جدید با فیلترهای ارث‌بری شده
        IF @NewFilters IS NOT NULL AND @NewFilters != ''
        BEGIN
            IF @InheritedFilters != ''
                SET @InheritedFilters = @InheritedFilters + ',' + @NewFilters;
            ELSE
                SET @InheritedFilters = @NewFilters;
        END
        
        -- ترکیب داده‌های محدودیت (این قسمت نیاز به پیاده‌سازی JSON merge دارد)
        IF @NewRestrictionsData IS NOT NULL AND @NewRestrictionsData != '{}'
        BEGIN
            -- در اینجا باید منطق ترکیب JSON پیاده‌سازی شود
            -- برای سادگی، فعلاً داده‌های جدید را اولویت می‌دهیم
            SET @InheritedRestrictionsData = @NewRestrictionsData;
        END
    END
    ELSE
    BEGIN
        -- اگر بوکمارک والد ندارد، فقط داده‌های جدید را استفاده کن
        SET @InheritedFilters = ISNULL(@NewFilters, '');
        SET @InheritedRestrictionsData = ISNULL(@NewRestrictionsData, '{}');
    END
    
    -- ایجاد بوکمارک جدید
    INSERT INTO BookmarkAccessControl (
        BookmarkId, OriginalCreator, CurrentAccessor, ParentBookmarkId,
        CreationLevel, Columns, Filters, RestrictionsData
    )
    VALUES (
        @NewBookmarkId, @OriginalCreator, @CurrentAccessor, @ParentBookmarkId,
        @CreationLevel, @Columns, @InheritedFilters, @InheritedRestrictionsData
    );
    
    -- ثبت در تاریخچه
    INSERT INTO BookmarkAccessHistory (
        BookmarkId, ActionType, PerformedBy, NewValues
    )
    VALUES (
        @NewBookmarkId, 'CREATE', @OriginalCreator,
        JSON_OBJECT(
            'ParentBookmarkId', @ParentBookmarkId,
            'CurrentAccessor', @CurrentAccessor,
            'CreationLevel', @CreationLevel
        )
    );
    
    SELECT 'SUCCESS' as Result, @NewBookmarkId as BookmarkId;
END;

-- Stored Procedure برای دریافت محدودیت‌های قابل اعمال برای یک کاربر
CREATE PROCEDURE sp_GetApplicableRestrictions
    @BookmarkId NVARCHAR(50),
    @CurrentUser NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @OriginalCreator NVARCHAR(100);
    DECLARE @ParentBookmarkId NVARCHAR(50);
    DECLARE @Filters NTEXT;
    DECLARE @RestrictionsData NTEXT;
    DECLARE @ShouldApplyRestrictions BIT = 0;
    
    -- دریافت اطلاعات بوکمارک
    SELECT 
        @OriginalCreator = OriginalCreator,
        @ParentBookmarkId = ParentBookmarkId,
        @Filters = Filters,
        @RestrictionsData = RestrictionsData
    FROM BookmarkAccessControl 
    WHERE BookmarkId = @BookmarkId;
    
    -- تعیین اینکه آیا محدودیت‌ها باید اعمال شود یا نه
    IF @OriginalCreator != @CurrentUser OR @ParentBookmarkId IS NOT NULL
    BEGIN
        SET @ShouldApplyRestrictions = 1;
        
        -- اگر کاربر سازنده اصلی است اما بوکمارک والد دارد، فقط محدودیت‌های والد اعمال شود
        IF @OriginalCreator = @CurrentUser AND @ParentBookmarkId IS NOT NULL
        BEGIN
            SELECT 
                @Filters = Filters,
                @RestrictionsData = RestrictionsData
            FROM BookmarkAccessControl 
            WHERE BookmarkId = @ParentBookmarkId;
        END
    END
    
    SELECT 
        @ShouldApplyRestrictions as ShouldApplyRestrictions,
        @Filters as Filters,
        @RestrictionsData as RestrictionsData,
        @OriginalCreator as OriginalCreator,
        @ParentBookmarkId as ParentBookmarkId;
END;

-- Function برای بررسی دسترسی کاربر به بوکمارک
CREATE FUNCTION fn_CheckBookmarkAccess(
    @BookmarkId NVARCHAR(50),
    @UserId NVARCHAR(100)
)
RETURNS BIT
AS
BEGIN
    DECLARE @HasAccess BIT = 0;
    
    -- بررسی اینکه آیا کاربر سازنده اصلی است یا دسترسی مستقیم دارد
    IF EXISTS (
        SELECT 1 FROM BookmarkAccessControl 
        WHERE BookmarkId = @BookmarkId 
        AND (OriginalCreator = @UserId OR CurrentAccessor = @UserId OR CurrentAccessor IS NULL)
        AND IsActive = 1
    )
    BEGIN
        SET @HasAccess = 1;
    END
    
    RETURN @HasAccess;
END;

-- View برای نمایش ساختار سلسله مراتبی بوکمارک‌ها
CREATE VIEW vw_BookmarkHierarchy AS
WITH BookmarkCTE AS (
    -- سطح اول: بوکمارک‌های اصلی (بدون والد)
    SELECT 
        BookmarkId,
        OriginalCreator,
        CurrentAccessor,
        ParentBookmarkId,
        CreationLevel,
        CAST(BookmarkId AS NVARCHAR(MAX)) as HierarchyPath,
        0 as Level
    FROM BookmarkAccessControl
    WHERE ParentBookmarkId IS NULL
    
    UNION ALL
    
    -- سطوح بعدی: بوکمارک‌های فرزند
    SELECT 
        b.BookmarkId,
        b.OriginalCreator,
        b.CurrentAccessor,
        b.ParentBookmarkId,
        b.CreationLevel,
        CAST(cte.HierarchyPath + ' -> ' + b.BookmarkId AS NVARCHAR(MAX)),
        cte.Level + 1
    FROM BookmarkAccessControl b
    INNER JOIN BookmarkCTE cte ON b.ParentBookmarkId = cte.BookmarkId
)
SELECT * FROM BookmarkCTE;

-- نمونه داده‌های تست
INSERT INTO BookmarkAccessControl (BookmarkId, OriginalCreator, CurrentAccessor, Columns, Filters, RestrictionsData)
VALUES 
('BOOK001', 'admin', NULL, 'col1,col2,col3', 'filter1,filter2', '{"maxAmount": 1000000, "allowedBranches": ["001", "002"]}'),
('BOOK002', 'user1', 'user2', 'col1,col2', 'filter1,filter3', '{"maxAmount": 500000, "allowedBranches": ["001"]}');

-- تست stored procedure
-- EXEC sp_CreateBookmarkWithInheritance 'BOOK003', 'user1', 'user3', 'BOOK001', 'col1,col4', 'filter4', '{"maxAmount": 750000}';

-- تست function
-- SELECT dbo.fn_CheckBookmarkAccess('BOOK001', 'admin') as HasAccess;