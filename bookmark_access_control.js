// Bookmark Access Control System
// This system handles different scenarios for bookmark creation and access restrictions

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

// Bookmark access control class
class BookmarkAccessControl {
  constructor() {
    this.currentUser = dundas.context.currentSession.accountName;
    this.bookmarkId = sessionStorage.getItem("bookmarkId");
    this.bookmarkCreator = null;
    this.bookmarkAccessLevel = null;
    this.existingRestrictions = [];
    this.newRestrictions = [];
  }

  // Initialize bookmark access control
  init() {
    this.loadBookmarkData();
    this.determineAccessLevel();
    this.applyAccessRestrictions();
  }

  // Load bookmark data from storage or API
  loadBookmarkData() {
    // Load existing restrictions from session storage
    const existingRestrictions = sessionStorage.getItem("bookmarkExistingRestrictions");
    if (existingRestrictions) {
      this.existingRestrictions = JSON.parse(existingRestrictions);
    }

    // Load bookmark creator information
    const bookmarkCreator = sessionStorage.getItem("bookmarkCreator");
    if (bookmarkCreator) {
      this.bookmarkCreator = bookmarkCreator;
    }
  }

  // Determine the access level based on user and bookmark relationship
  determineAccessLevel() {
    if (!this.bookmarkId) {
      this.bookmarkAccessLevel = 'NEW_BOOKMARK';
      return;
    }

    if (this.bookmarkCreator === this.currentUser) {
      this.bookmarkAccessLevel = 'OWNER';
    } else {
      this.bookmarkAccessLevel = 'VIEWER';
    }
  }

  // Apply access restrictions based on access level
  applyAccessRestrictions() {
    switch (this.bookmarkAccessLevel) {
      case 'NEW_BOOKMARK':
        this.handleNewBookmarkCreation();
        break;
      case 'OWNER':
        this.handleOwnerAccess();
        break;
      case 'VIEWER':
        this.handleViewerAccess();
        break;
    }
  }

  // Handle new bookmark creation
  handleNewBookmarkCreation() {
    // When creating a new bookmark, apply current user's restrictions
    this.applyCurrentUserRestrictions();
  }

  // Handle owner access (creator of the bookmark)
  handleOwnerAccess() {
    // Owner has full access but should respect existing restrictions
    // when creating new bookmarks for others
    this.applyExistingRestrictions();
    this.enableBookmarkCreationForOthers();
  }

  // Handle viewer access (someone accessing another's bookmark)
  handleViewerAccess() {
    // Viewer has limited access based on creator's restrictions
    this.applyExistingRestrictions();
    this.disableBookmarkCreation();
  }

  // Apply current user's restrictions
  applyCurrentUserRestrictions() {
    // Get current user's restrictions from system
    const userRestrictions = this.getCurrentUserRestrictions();
    this.newRestrictions = userRestrictions;
    
    // Store for future reference
    sessionStorage.setItem("currentUserRestrictions", JSON.stringify(userRestrictions));
  }

  // Apply existing restrictions from the bookmark
  applyExistingRestrictions() {
    if (this.existingRestrictions.length > 0) {
      this.existingRestrictions.forEach(restriction => {
        disableElements(restriction);
      });
    }
  }

  // Enable bookmark creation for others (with restrictions)
  enableBookmarkCreationForOthers() {
    // Enable bookmark creation functionality
    // But apply restrictions when creating for others
    this.setupBookmarkCreationWithRestrictions();
  }

  // Disable bookmark creation for viewers
  disableBookmarkCreation() {
    // Disable bookmark creation buttons/elements
    const bookmarkElements = ['bookmarkCreateBtn', 'bookmarkSaveBtn'];
    bookmarkElements.forEach(elementId => {
      disableElements(elementId);
    });
  }

  // Setup bookmark creation with restrictions
  setupBookmarkCreationWithRestrictions() {
    // Override bookmark creation to include current restrictions
    const originalCreateBookmark = window.createBookmark;
    window.createBookmark = (targetUser) => {
      if (targetUser !== this.currentUser) {
        // Apply current user's restrictions for the new bookmark
        this.applyRestrictionsForNewBookmark(targetUser);
      }
      return originalCreateBookmark.call(this, targetUser);
    };
  }

  // Apply restrictions for new bookmark creation
  applyRestrictionsForNewBookmark(targetUser) {
    const currentRestrictions = this.getCurrentUserRestrictions();
    const combinedRestrictions = [...this.existingRestrictions, ...currentRestrictions];
    
    // Store restrictions for the new bookmark
    sessionStorage.setItem("newBookmarkRestrictions", JSON.stringify(combinedRestrictions));
    sessionStorage.setItem("newBookmarkTargetUser", targetUser);
  }

  // Get current user's restrictions
  getCurrentUserRestrictions() {
    // This should be implemented based on your user permission system
    // For now, returning empty array as placeholder
    return [];
  }

  // Save bookmark with proper restrictions
  saveBookmarkWithRestrictions(bookmarkData) {
    const targetUser = sessionStorage.getItem("newBookmarkTargetUser");
    const restrictions = sessionStorage.getItem("newBookmarkRestrictions");
    
    if (targetUser && targetUser !== this.currentUser) {
      // Add restrictions to bookmark data
      bookmarkData.restrictions = JSON.parse(restrictions);
      bookmarkData.creator = this.currentUser;
      bookmarkData.targetUser = targetUser;
    }
    
    return bookmarkData;
  }
}

// Modified processResults function with access control
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

    // Initialize access control
    const accessControl = new BookmarkAccessControl();
    
    // Store bookmark creator information
    sessionStorage.setItem("bookmarkCreator", username);
    sessionStorage.setItem("bookmarkExistingRestrictions", JSON.stringify(filters));
    
    // Initialize access control
    accessControl.init();

    // Update column visibility
    if (columns) {
        countindex = updateColumnVisibility(currentViewName, columns);
        sessionStorage.setItem("countindex", JSON.stringify(countindex));
    }

    // Apply filters based on access control
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

// Enhanced bookmark creation function
function createBookmarkWithAccessControl(targetUser) {
    const accessControl = new BookmarkAccessControl();
    accessControl.init();
    
    // Get current restrictions
    const currentRestrictions = sessionStorage.getItem("currentUserRestrictions");
    const existingRestrictions = sessionStorage.getItem("bookmarkExistingRestrictions");
    
    let finalRestrictions = [];
    
    if (currentRestrictions) {
        finalRestrictions = JSON.parse(currentRestrictions);
    }
    
    if (existingRestrictions && targetUser !== accessControl.currentUser) {
        const existing = JSON.parse(existingRestrictions);
        finalRestrictions = [...finalRestrictions, ...existing];
    }
    
    // Create bookmark data with restrictions
    const bookmarkData = {
        creator: accessControl.currentUser,
        targetUser: targetUser,
        restrictions: finalRestrictions,
        timestamp: new Date().toISOString()
    };
    
    return bookmarkData;
}

// Function to check if user can modify bookmark
function canModifyBookmark() {
    const bookmarkCreator = sessionStorage.getItem("bookmarkCreator");
    const currentUser = dundas.context.currentSession.accountName;
    
    return bookmarkCreator === currentUser;
}

// Function to get bookmark restrictions for current user
function getBookmarkRestrictionsForUser() {
    const bookmarkCreator = sessionStorage.getItem("bookmarkCreator");
    const currentUser = dundas.context.currentSession.accountName;
    const existingRestrictions = sessionStorage.getItem("bookmarkExistingRestrictions");
    
    if (bookmarkCreator === currentUser) {
        // Owner can see all restrictions but can modify
        return existingRestrictions ? JSON.parse(existingRestrictions) : [];
    } else {
        // Viewer sees restrictions but cannot modify
        return existingRestrictions ? JSON.parse(existingRestrictions) : [];
    }
}