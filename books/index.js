var app = angular.module('BooksApp', [
  "ngRoute",
  "ngTouch",
  "mobile-angular-ui",
  "firebase"
]);
 
app.config(function($routeProvider, $locationProvider) {
  $routeProvider.when('/', {
    templateUrl: 'signIn.html',
    controller: 'SignInController'
  });
  $routeProvider.when('/signUp', {
    templateUrl: 'signUp.html',
    controller: 'SignUpController'
  });
  $routeProvider.when('/userHome', {
    templateUrl: 'userHome.html'
  });
  $routeProvider.when('/addBook', {
    templateUrl: 'bookForm.html',
    controller: 'BookController'
  });
  $routeProvider.when('/editBook/:param', {
    templateUrl: 'bookForm.html',
    controller: 'BookController'
  });
  $routeProvider.when('/books/:param', {
    templateUrl: 'books.html',
    controller: 'BooksController'
  });
});

app.controller('SignInController', ['$scope', '$location', '$firebaseAuth', 
  function ($scope, $location, $firebaseAuth) {
    $scope.user = { useremail: "", password: "" };
  
    $scope.signIn = function() {
      if ($scope.user.useremail && $scope.user.password) {
        validUser = false;
        
        var auth = $firebaseAuth($scope.$parent.dataRef);
        auth.$authWithPassword({
          email : $scope.user.useremail,
          password : $scope.user.password
        })
        .then(function(authData) {
          console.log("Authenticated successfully with payload:", authData);
          $scope.$parent.login();
          $location.path('/userHome');
        })
        .catch(function(error) {
          console.log("Login Failed!", error);
        });
      }
    }
  }
]);

app.controller('SignUpController', ['$scope', '$location',
  function ($scope, $location) {
    $scope.user = { useremail: "", password: "" };
  
    $scope.signUp = function() {
      $scope.$parent.dataRef.createUser({
        email : $scope.user.useremail,
        password : $scope.user.password
      }, function(error, userData) {
        if (error) {
          console.log("Error creating user:", error);
        } else {
          console.log("Successfully created user account with uid:", userData.uid);
          $location.path('/');
        }
      });
    }
  }
]);

app.controller('BooksController', ['$scope', '$location', '$routeParams',
  function ($scope, $location, $routeParams) {
    $scope.editMode = ($routeParams.param == "edit");
    
    $scope.deleteBook = function(bookId) {
      if (confirm("Do you want to delete?") == true) {
        for (var i = 0; i < $scope.$parent.booksArr.length; i++) {
          var bookRef = new Firebase(firebaseBaseUrl + $scope.$parent.booksArr[i].$id);
          bookRef.remove();
        }
      }
    }
    
    $scope.editBook = function(bookId) {
      $scope.activeBookId = bookId;
      $location.path('/editBook/'+bookId);
    }
  }
]);

app.controller('BookController', ['$scope', '$location', '$firebaseArray', '$routeParams',
  function ($scope, $location, $firebaseArray, $routeParams) {
    $scope.activeBookId = $routeParams.param;
    $scope.book = {};
    
    $scope.formSubmit = false;
    $scope.formSuccess = false;
    $scope.lastActiveBookString = "";
    
    if ($scope.activeBookId > -1) {
      $scope.editMode = true;
      
      if ($scope.$parent.booksArr[$scope.activeBookId] != undefined) {
        
        $scope.book.isbn = $scope.$parent.booksArr[$scope.activeBookId].isbn;
        $scope.book.author = $scope.$parent.booksArr[$scope.activeBookId].author;
        $scope.book.title = $scope.$parent.booksArr[$scope.activeBookId].title;
      }
    }
    
    $scope.submitBook = function() {
      if ($scope.activeBookId > -1) {
        $scope.editBook();
      } else {
        $scope.addBook();
      }
    }
    
    $scope.editBook = function() {
      if ($scope.$parent.booksArr[$scope.activeBookId] != undefined) {
        
        $scope.$parent.booksArr[$scope.activeBookId].isbn = $scope.book.isbn;
        $scope.$parent.booksArr[$scope.activeBookId].author = $scope.book.author;
        $scope.$parent.booksArr[$scope.activeBookId].title = $scope.book.title;
      
        $scope.$parent.booksArr.$save($scope.$parent.booksArr[$scope.activeBookId]).then(function() {
          $scope.formSuccess = true;
          $scope.formSubmit = true;
          $location.path('/books/edit');
        });
      }
    }
    
    $scope.addBook = function() {
      $scope.dataRef.push(
        { 
          added: new Date().toISOString().substr(0, 10),          
          isbn: $scope.book.isbn,
          author: $scope.book.author,
          title: $scope.book.title
        }
      );
      $scope.lastActiveBookString = '"' + $scope.book.title + '" (' + $scope.book.author + ')';
      $scope.book.isbn = "";
      $scope.book.author = "";
      $scope.book.title = "";
      $scope.formSuccess = true;
      $scope.formSubmit = true;
    }
    
    $scope.submitBookDisabled = function() {
      if ($scope.book != undefined) {
        return (
          $scope.book.isbn==undefined||$scope.book.isbn==''||
          !$scope.book.isbn.match(/((978[\--– ])?[0-9][0-9\--– ]{10}[\--– ][0-9xX])|((978)?[0-9]{9}[0-9Xx])/g) || 
          $scope.book.author==undefined||$scope.book.author=='' || 
          $scope.book.title==undefined||$scope.book.title==''
        );
      } else {
        return true;
      }
    }
  }
]);

app.controller('MainController', ['$scope', '$location', '$firebaseArray',
  function ($scope, $location, $firebaseArray) {  
    $scope.init = function() {
      if ($scope.dataRef == undefined) {
        $scope.dataRef = new Firebase(firebaseBaseUrl);
        $scope.booksArr = [];
      }
      if ($scope.loggedIn == undefined) {
        $scope.loggedIn = false;
        $location.path('/');
      }
      if ($scope.activeBookId == undefined) {
        $scope.activeBookId = -1;
      }
      $scope.orderProp = 'added';
    };   
    $scope.init();
    
    $scope.login = function() {
      $scope.loggedIn = true;
      $scope.booksArr = $firebaseArray($scope.dataRef);
    };
    
    $scope.logout = function() { 
      $scope.loggedIn = false;
      $scope.booksArr.$destroy();
      $scope.dataRef.unauth();
      $location.path('/');
    }
  }
]);