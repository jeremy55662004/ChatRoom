var app = angular.module("chatRoom", []);

app.factory('socket', function($rootScope) {
    var socket = io(); //it defaults to trying to connect to the host
    return {
        on: function(eventName, callback) {
            socket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {   
                    callback.apply(socket, args);
                });
            });
        },
        emit: function(eventName, data, callback) {
            socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if(callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
});

app.factory('randomColor', function($rootScope) {
    return {
        newColor: function() {
            return '#'+('00000'+(Math.random()*0x1000000<<0).toString(16)).slice(-6);
        }
    };
});

app.factory('userService', function($rootScope) {
    return {
        get: function(users,nickname) {
            if(users instanceof Array){
                for(var i=0;i<users.length;i++){
                    if(users[i].nickname===nickname){
                        return users[i];
                    }
                }
            }else{
                return null;
            }
        }
    };
});


app.controller("chatCtrl",['$scope','socket','randomColor','userService',function($scope,socket,randomColor,userService){
    var messageWrapper= $('.message-wrapper');
    $scope.hasLogined=false;
    $scope.receiver=""; //group chat
    $scope.publicMessages=[]; //public messages
    $scope.privateMessages={}; //private messages
    $scope.messages=$scope.publicMessages; //default public messages
    $scope.users=[];
    $scope.color=randomColor.newColor(); // color of profile picture
    $scope.login=function(){                                                //login
        socket.emit("addUser",{nickname:$scope.nickname,color:$scope.color});
    }
    $scope.scrollToBottom=function(){
        messageWrapper.scrollTop(messageWrapper[0].scrollHeight);
    }

    $scope.postMessage=function(){
        var msg={text:$scope.words,type:"normal",color:$scope.color,from:$scope.nickname,to:$scope.receiver};
        var rec=$scope.receiver;
        if(rec){                             //private messages
           if(!$scope.privateMessages[rec]){
               $scope.privateMessages[rec]=[];
           }
            $scope.privateMessages[rec].push(msg);
        }else{                              //public messages
            $scope.publicMessages.push(msg);
        }
        $scope.words="";
        if(rec!==$scope.nickname) {        //exclude myself
            socket.emit("addMessage", msg);
        }
    }
    $scope.setReceiver=function(receiver){
        $scope.receiver=receiver;
        if(receiver){                      //for private user
            if(!$scope.privateMessages[receiver]){
                $scope.privateMessages[receiver]=[];
            }
            $scope.messages=$scope.privateMessages[receiver];
        }else{                             //broadcast
            $scope.messages=$scope.publicMessages;
        }
        var user=userService.get($scope.users,receiver);
        if(user){
            user.hasNewMessage=false;
        }
    }

    
    socket.on('userAddingResult',function(data){
        if(data.result){
            $scope.userExisted=false;
            $scope.hasLogined=true;
        }else{
            $scope.userExisted=true;
        }
    });

    
    socket.on('userAdded', function(data) {
        if(!$scope.hasLogined) return;
        $scope.publicMessages.push({text:data.nickname,type:"welcome"});
        $scope.users.push(data);
    });

    
    socket.on('allUser', function(data) {
        if(!$scope.hasLogined) return;
        $scope.users=data;
    });

    
    socket.on('userRemoved', function(data) {
        if(!$scope.hasLogined) return;
        $scope.publicMessages.push({text:data.nickname,type:"bye"});
        for(var i=0;i<$scope.users.length;i++){
            if($scope.users[i].nickname==data.nickname){
                $scope.users.splice(i,1);
                return;
            }
        }
    });

    
    socket.on('messageAdded', function(data) {
        if(!$scope.hasLogined) return;
        if(data.to){
            if(!$scope.privateMessages[data.from]){
                $scope.privateMessages[data.from]=[];
            }
            $scope.privateMessages[data.from].push(data);
        }else{
            $scope.publicMessages.push(data);
        }
        var fromUser=userService.get($scope.users,data.from);
        var toUser=userService.get($scope.users,data.to);
        if($scope.receiver!==data.to) {
            if (fromUser && toUser.nickname) {
                fromUser.hasNewMessage = true;     //private
            } else {
                toUser.hasNewMessage = true;       //public
            }
        }
    });



}]);

app.directive('message', ['$timeout',function($timeout) {
    return {
        restrict: 'E',
        templateUrl: 'message.html',
        scope:{
            info:"=",
            self:"=",
            scrolltothis:"&"
        },
        link:function(scope, elem, attrs){
                scope.time=new Date();
                $timeout(scope.scrolltothis);
                $timeout(function(){
                    elem.find('.avatar').css('background',scope.info.color);
                });
        }
    };
}])
    .directive('user', ['$timeout',function($timeout) {
        return {
            restrict: 'E',
            templateUrl: 'user.html',
            scope:{
                info:"=",
                iscurrentreceiver:"=",
                setreceiver:"&"
            },
            link:function(scope, elem, attrs,chatCtrl){
                $timeout(function(){
                    elem.find('.avatar').css('background',scope.info.color);
                });
            }
        };
}]);