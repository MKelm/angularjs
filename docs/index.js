var app = angular.module(
  'DocsApp', [ "ngRoute", "ngTouch", "mobile-angular-ui", "firebase" ]
);

app.config(function($routeProvider, $locationProvider) {
  $routeProvider.when('/signIn', {
    templateUrl: 'signIn.html',
    controller: 'SignInController'
  });
  $routeProvider.when('/signUp', {
    templateUrl: 'signUp.html',
    controller: 'SignUpController'
  });
  $routeProvider.when('/docs', {
    templateUrl: 'docs.html',
    controller: 'DocsController'
  });
  $routeProvider.when('/doc/:param', {
    templateUrl: 'doc.html',
    controller: 'DocController'
  });
  $routeProvider.when('/folders', {
    templateUrl: 'folders.html',
    controller: 'FoldersController'
  });
  $routeProvider.when('/folder/:param', {
    templateUrl: 'folder.html',
    controller: 'FolderController'
  });
});

// sign in with email / pass via firebase auth
app.controller('SignInController', ['$scope', '$location', '$firebaseAuth', 
  function ($scope, $location, $firebaseAuth) {
    $scope.user = { useremail: "", password: "" };
  
    $scope.signIn = function() {
      if ($scope.user.useremail && $scope.user.password) {
        validUser = false;
        
        var auth = $firebaseAuth($scope.$parent.docsRef);
        auth.$authWithPassword({
          email : $scope.user.useremail,
          password : $scope.user.password
        })
        .then(function(authData) {
          console.log("Authenticated successfully with payload:", authData);
          $scope.$parent.login(authData.uid.substr(12));
          $location.path('/docs');
        })
        .catch(function(error) {
          console.log("Login Failed!", error);
        });
      }
    }
    
    if (autoLogin !== null) {
      $scope.user.useremail = autoLogin.email;
      $scope.user.password = autoLogin.pass;
      $scope.signIn();
    }
  }
]);

// sign up firebase database account
app.controller('SignUpController', ['$scope', '$location', '$firebaseAuth', 
  function ($scope, $location, $firebaseAuth) {
    $scope.user = { useremail: "", password: "" };
  
    $scope.signUp = function() {
      var auth = $firebaseAuth($scope.$parent.docsRef);
      
      auth.$createUser({
        email: $scope.user.useremail,
        password: $scope.user.password
      }).then(function(userData) {
        console.log("Successfully created user account with uid:", userData.uid);
        $location.path("/signIn");
        
      }).catch(function(error) {
        console.error("Error: ", error);
      });
    }
  }
]);

// to load documents list by using an active folder
// otherwise create first private folder to use
// edit / delete documents from active folder
app.controller('DocsController', ['$scope', '$location', '$firebaseObject', 
  function ($scope, $location, $firebaseObject) {
    
    $scope.loadDocs = function() {
      // load docs from active folder
      if ($scope.$parent.activeFolder !== null) {
        $scope.$parent.unbindDocs();
        $scope.$parent.docsRef = new Firebase(firebaseBaseUrl + "docs/" + $scope.$parent.activeFolder);
        $firebaseObject($scope.$parent.docsRef).$bindTo($scope.$parent, "docsObj").then(function(unbind) { 
          $scope.$parent.unbindDocs = unbind;        
        });
      }
    };
    
    // determine active folder and/or create first folder
    if ($scope.$parent.activeFolder === null) {
      
      var foldersRef = new Firebase(firebaseBaseUrl + "folders/private/" + $scope.$parent.userId + "/" );
      foldersRef.once("value", function(data) {
        var count = (data.val() !== null) ? Object.keys(data.val()).length : 0;
        if (count > 0) {
          // private folders exist select first one
          var keys = Object.keys(data.val());
          $scope.$parent.activeFolder = "private/" + $scope.$parent.userId + "/" + keys[0] + "/";

        } else {
          // no private folders exist create first
          var newFolderRef = foldersRef.push(
            { 
              added: new Date().toISOString(),          
              title: "First private folder"
            }
          );
          $scope.$parent.activeFolder = "private/" + $scope.$parent.userId + "/" + newFolderRef.key() + "/";
        }
        
        $scope.loadDocs();
      });      
    } else {
      // use active folder to load docs
      $scope.loadDocs();
    }
  
    $scope.deleteDoc = function(docId) {
      if (confirm("Do you want to delete?") == true) {
        var docRef = new Firebase(firebaseBaseUrl + "docs/" + $scope.$parent.activeFolder + docId);
        docRef.remove();
      }
    }
    
    $scope.editDoc = function(docId) {
      $scope.activeDocId = docId;
      $location.path('/doc/'+docId);
    }
  }
]);

// create new document or get selected element to edit
app.controller('DocController', ['$scope', '$location', '$routeParams', '$firebaseObject', 
  function ($scope, $location, $routeParams, $firebaseObject) {
    $scope.activeDocId = $routeParams.param;
    $scope.document = {};
    $scope.docPath = $scope.$parent.activeFolder + $scope.activeDocId;
    
    if ($scope.activeDocId == "new") {
      var newDocRef = $scope.$parent.docsRef.push(
        { 
          added: new Date().toISOString(),          
          title: "New document",
          text: ""
        }
      );
      $location.path('/doc/' + newDocRef.key());

    } else {
      $scope.$parent.docRef = new Firebase(firebaseBaseUrl + "docs/" + $scope.docPath);
      $firebaseObject($scope.$parent.docRef).$bindTo($scope, "document").then(function(unbind) { 
        $scope.$parent.unbindDoc = unbind;  
      });
    }
  }
]);

// create new private / public folder or edit selected folder properties
app.controller('FolderController', ['$scope', '$location', '$routeParams', '$firebaseObject', 
  function ($scope, $location, $routeParams, $firebaseObject) {
    $scope.activeFolderId = $routeParams.param;
    $scope.folder = {};
    
    if ($scope.activeFolderId == "newPublic" || $scope.activeFolderId == "newPrivate") {
      if ($scope.activeFolderId == "newPublic") {
        console.log("create new public");
        var folderPath = "public";
        var type = "public";
      } else if ($scope.activeFolderId == "newPrivate") {
        console.log("create new private");
        var folderPath = "private/" + $scope.$parent.userId;
        var type = "private";
      }
      
      var foldersRef = new Firebase(firebaseBaseUrl + "folders/" + folderPath + "/" );
      var newFolderRef = foldersRef.push(
        { 
          added: new Date().toISOString(),          
          title: "New " + type + " folder"
        }
      );
      $location.path('/folder/' + type + newFolderRef.key());
      
    } else {
    
      if ($scope.activeFolderId.indexOf('private') === 0) {
        $scope.folderPath = folderPath = "private/"+$scope.$parent.userId+"/"+$scope.activeFolderId.substr(7);
      } else {
        $scope.folderPath = "public/"+$scope.activeFolderId.substr(6);
      }
      console.log("folder path", firebaseBaseUrl + "folders/" + $scope.folderPath);
      $scope.$parent.folderRef = new Firebase(firebaseBaseUrl + "folders/" + $scope.folderPath);
      $firebaseObject($scope.$parent.folderRef).$bindTo($scope, "folder").then(function(unbind) { 
        $scope.$parent.unbindFolder = unbind;  
      });
    }
  }
]);

// load folders to show in list or perform select / delete or edit folder
app.controller('FoldersController', ['$scope', '$location', '$firebaseObject', 
  function ($scope, $location, $firebaseObject) {
  
    $scope.selectFolder = function(folderId, publicFolder = true) {
      if (publicFolder == false) 
        $scope.$parent.activeFolder = "private/" + $scope.$parent.userId + "/" + folderId + "/";
      else
        $scope.$parent.activeFolder = "public/" + folderId + "/";
      $location.path('/docs');
    }
    
    $scope.deleteFolder = function(folderId, publicFolder = true) {
      if (publicFolder == false) {
        var folderPath = 'private/'+$scope.$parent.userId+'/'+folderId;
      } else {
        var folderPath = 'public/'+folderId;
      }
    
      if (confirm("Do you want to delete?") == true) {
      
        var folderRef = new Firebase(firebaseBaseUrl + "folders/" + folderPath);
        folderRef.remove();
        
        var folderDocsRef = new Firebase(firebaseBaseUrl + "docs/" + folderPath);
        folderDocsRef.remove();
      }
    }
    
    $scope.editFolder = function(folderId, publicFolder = true) {
      if (publicFolder == false) {
        $location.path('/folder/private'+folderId);
      } else {
        $location.path('/folder/public'+folderId);
      }
    }
    
    $scope.publicFoldersRef = new Firebase(firebaseBaseUrl + "folders/public");
    $firebaseObject($scope.publicFoldersRef).$bindTo($scope, "publicFolders").then(function(unbind) { 
      $scope.unbindPublicFolders = unbind;        
    });
    
    $scope.privateFoldersRef = new Firebase(firebaseBaseUrl + "folders/private/" + $scope.$parent.userId + "/");
    $firebaseObject($scope.privateFoldersRef).$bindTo($scope, "privateFolders").then(function(unbind) { 
      $scope.unbindPrivateFolders = unbind;        
    });
    
  }
]);

// prepare / initialize global variables or perform login / logout
app.controller('MainController', ['$scope', '$location', '$firebaseObject', 
  function ($scope, $location, $firebaseObject) {  
    $scope.init = function() {
      if ($scope.docsRef == undefined) {
        $scope.docsObj = {};
        $scope.docsRef = new Firebase(firebaseBaseUrl);
        $scope.docRef = $scope.docsRef;
        $scope.publicFoldersRef = $scope.docsRef;
        $scope.privateFoldersRef = $scope.docsRef;
        $scope.folderRef = $scope.docsRef;
      }
      if ($scope.loggedIn == undefined) {
        $scope.loggedIn = false;
        $scope.userId = -1;
        $scope.activeFolder = null;
        $location.path('/signIn');
      }
      if ($scope.activeDocId == undefined) {
        $scope.activeDocId = -1;
      }
      $scope.orderProp = 'added';
    };   
    $scope.init();
    
    $scope.login = function(uid) {
      $scope.loggedIn = true;
      
      $scope.userId = uid;
      $scope.activeFolder = null;

      // prepare data binding with unbind functions
      $scope.unbindDocs = function() {};
      $scope.unbindDoc = function() {};
      $scope.unbindFolder = function() {};
      $scope.unbindPublicFolders = function() {};
      $scope.unbindPrivateFolders = function() {};
    };
    
    $scope.logout = function() { 
      $scope.loggedIn = false;
      $scope.userId = -1;
      $scope.activeFolder = null;
      
      // unbind / set off three-way-data binding
      $scope.unbindFolder();
      $scope.folderRef.off();
      $scope.unbindPublicFolders();
      $scope.publicFoldersRef.off();
      $scope.unbindPrivateFolders();
      $scope.privateFoldersRef.off();
      $scope.unbindDoc();
      $scope.docRef.off();
      $scope.unbindDocs();
      $scope.docsRef.off();
      
      $scope.docsRef.unauth();
      $location.path('/signIn');
    }
  }
]);