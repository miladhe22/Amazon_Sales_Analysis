// Enhanced Bookmark System with Access Control
// Handles all scenarios: self-bookmarks, other-user bookmarks, and nested restrictions

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

// Main bookmark access control system
class EnhancedBookmarkSystem {
  constructor() {
    this.currentUser = dundas.context.currentSession.accountName;
    this.bookmarkId = sessionStorage.getItem("bookmarkId");
    this.dashboardURL = document.URL;
    this.preLocation = document.referrer;
    this.isRefreshedPage = this.dashboardURL === this.preLocation;
    
    // Bookmark metadata
    this.bookmarkCreator = null;
    this.bookmarkTargetUser = null;
    this.existingRestrictions = [];
    this.currentUserRestrictions = [];
    this.combinedRestrictions = [];
    
    // Access levels
    this.accessLevel = null;
    this.canCreateBookmarks = false;
    this.canModifyBookmarks = false;
  }

  // Initialize the system
  init() {
    this.loadBookmarkData();
    this.determineAccessLevel();
    this.applyAccessRestrictions();
    this.setupBookmarkCreation();
  }

  // Load bookmark data from storage
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

  // Determine access level based on user relationship to bookmark
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

  // Apply access restrictions based on access level
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

  // Handle new bookmark creation scenario
  handleNewBookmarkScenario() {
    // User is creating a new bookmark
    // Apply current user's restrictions
    this.applyCurrentUserRestrictions();
    
    // Enable all functionality for self
    this.enableAllFunctionality();
  }

  // Handle owner scenario (creator accessing their own bookmark)
  handleOwnerScenario() {
    // Owner has full access to their bookmark
    // But when creating new bookmarks for others, apply combined restrictions
    this.applyExistingRestrictions();
    this.enableAllFunctionality();
    this.setupRestrictedBookmarkCreation();
  }

  // Handle viewer scenario (someone accessing another's bookmark)
  handleViewerScenario() {
    // Viewer has limited access based on creator's restrictions
    this.applyExistingRestrictions();
    this.disableBookmarkCreation();
    this.disableModification();
  }

  // Apply current user's restrictions
  applyCurrentUserRestrictions() {
    // Get current user's restrictions from system
    this.currentUserRestrictions = this.getCurrentUserRestrictions();
    sessionStorage.setItem("currentUserRestrictions", JSON.stringify(this.currentUserRestrictions));
  }

  // Apply existing restrictions from the bookmark
  applyExistingRestrictions() {
    if (this.existingRestrictions.length > 0) {
      this.existingRestrictions.forEach(restriction => {
        disableElements(restriction);
      });
    }
  }

  // Enable all functionality for owner/creator
  enableAllFunctionality() {
    // Enable all UI elements for full access
    const enableElements = ['bookmarkCreateBtn', 'bookmarkSaveBtn', 'bookmarkEditBtn'];
    enableElements.forEach(elementId => {
      enableElements(elementId);
    });
  }

  // Disable bookmark creation for viewers
  disableBookmarkCreation() {
    const bookmarkElements = ['bookmarkCreateBtn', 'bookmarkSaveBtn'];
    bookmarkElements.forEach(elementId => {
      disableElements(elementId);
    });
  }

  // Disable modification for viewers
  disableModification() {
    const modificationElements = ['bookmarkEditBtn', 'parameterEditBtn'];
    modificationElements.forEach(elementId => {
      disableElements(elementId);
    });
  }

  // Setup restricted bookmark creation for owners
  setupRestrictedBookmarkCreation() {
    // Override bookmark creation to include restrictions
    const originalCreateBookmark = window.createBookmark;
    window.createBookmark = (targetUser) => {
      return this.createBookmarkWithRestrictions(targetUser);
    };
  }

  // Create bookmark with proper restrictions
  createBookmarkWithRestrictions(targetUser) {
    let finalRestrictions = [];
    
    // Always include existing restrictions
    if (this.existingRestrictions.length > 0) {
      finalRestrictions = [...this.existingRestrictions];
    }
    
    // If creating for someone else, add current user's restrictions
    if (targetUser !== this.currentUser) {
      finalRestrictions = [...finalRestrictions, ...this.currentUserRestrictions];
    }
    
    // Create bookmark data
    const bookmarkData = {
      creator: this.currentUser,
      targetUser: targetUser,
      restrictions: finalRestrictions,
      originalRestrictions: this.existingRestrictions,
      currentUserRestrictions: this.currentUserRestrictions,
      timestamp: new Date().toISOString(),
      accessLevel: targetUser === this.currentUser ? 'SELF' : 'OTHER'
    };
    
    // Store for the new bookmark
    sessionStorage.setItem("newBookmarkData", JSON.stringify(bookmarkData));
    
    return bookmarkData;
  }

  // Get current user's restrictions from system
  getCurrentUserRestrictions() {
    // This should be implemented based on your user permission system
    // For now, returning empty array as placeholder
    return [];
  }

  // Setup bookmark creation system
  setupBookmarkCreation() {
    // Override the bookmark creation process
    this.overrideBookmarkCreation();
  }

  // Override bookmark creation process
  overrideBookmarkCreation() {
    // Store original functions
    const originalCreateBookmark = window.createBookmark;
    const originalSaveBookmark = window.saveBookmark;
    
    // Override create bookmark
    window.createBookmark = (targetUser) => {
      return this.handleBookmarkCreation(targetUser);
    };
    
    // Override save bookmark
    window.saveBookmark = (bookmarkData) => {
      return this.handleBookmarkSaving(bookmarkData);
    };
  }

  // Handle bookmark creation with restrictions
  handleBookmarkCreation(targetUser) {
    let restrictions = [];
    
    // Scenario 1: Creating bookmark for self
    if (targetUser === this.currentUser) {
      restrictions = this.currentUserRestrictions;
    }
    // Scenario 2: Creating bookmark for others
    else {
      // Combine existing restrictions with current user's restrictions
      restrictions = [...this.existingRestrictions, ...this.currentUserRestrictions];
    }
    
    return {
      targetUser: targetUser,
      restrictions: restrictions,
      creator: this.currentUser,
      timestamp: new Date().toISOString()
    };
  }

  // Handle bookmark saving with restrictions
  handleBookmarkSaving(bookmarkData) {
    const targetUser = bookmarkData.targetUser;
    
    // Add restriction metadata
    bookmarkData.restrictions = bookmarkData.restrictions || [];
    bookmarkData.creator = this.currentUser;
    bookmarkData.targetUser = targetUser;
    bookmarkData.originalRestrictions = this.existingRestrictions;
    bookmarkData.currentUserRestrictions = this.currentUserRestrictions;
    
    return bookmarkData;
  }
}

// Enhanced processResults function
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

    // Initialize enhanced bookmark system
    const bookmarkSystem = new EnhancedBookmarkSystem();
    
    // Store bookmark metadata
    sessionStorage.setItem("bookmarkCreator", username);
    sessionStorage.setItem("bookmarkExistingRestrictions", JSON.stringify(filters));
    
    // Initialize the system
    bookmarkSystem.init();

    // Update column visibility
    if (columns) {
        countindex = updateColumnVisibility(currentViewName, columns);
        sessionStorage.setItem("countindex", JSON.stringify(countindex));
    }

    // Apply access-based restrictions
    if (username != name) {
        // Apply existing restrictions for viewers
        filters.forEach(function(x) {
            disableElements(x);
        });
    }

    sessionStorage.setItem("dictArray", DictFilters);
    var parsedParameters = JSON.parse(DictFilters);
    resetFilters(parsedParameters);
}

// Main initialization function
function initializeBookmarkSystem() {
    var bookmarkId = sessionStorage.getItem("bookmarkId");
    if (bookmarkId) {
        sessionStorage.setItem('bookmarkId', bookmarkId);
        localStorage.removeItem('bookmarkId');
    }

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

    // Check if page was refreshed
    if (dashboardURL == preLocation) {
        // Disable interaction on specific elements
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
        // Handle new bookmark creation
        handleNewBookmarkCreation();
    }
}

// Handle new bookmark creation
function handleNewBookmarkCreation() {
    // Set default date range
    setDefaultDateRange();
    
    function RunQuery() {
        countindex = updateColumnVisibility(currentViewName, dictparse[currentViewName]);
        var dict = getParametersDict(ParamsArray);
        
        sessionStorage.setItem("countindex", JSON.stringify(countindex));
        sessionStorage.setItem("dictArray", JSON.stringify(dict));
    }
    
    setTimeout(RunQuery, 3000);
}

// Set default date range
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

// Initialize the system when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeBookmarkSystem();
});