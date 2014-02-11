Rooms = new Meteor.Collection("rooms");
Users = new Meteor.Collection("users");

// Objects
var Room = function () {
  this.users = [];
  this.messages = [];
}

var User = function (name) {
  this.name = name;
}

var Message = function (user, text) {
  this.user = user;
  this.text = text;
}

// Utility functions
var getUser = function () {
  return Users.findOne(Session.get('userId'));
}

var getUsername = function (userId) {
  return Users.findOne(userId).name;
}

var inRoom = function () {
  var user = getUser();
  return user && user.roomId != undefined;
}

var sendMessage = function (roomId, sender, text) {
  var message = new Message(sender, text);
  Rooms.update(roomId, {$push: {messages: message}});
}

// Function to auto-create a room on start up
// Temporary hack until we support multiple rooms
var initRoom = function () {
  if (Rooms.find().count() == 0) {
    console.log("create");
    Rooms.insert(new Room());
  }
}

var getRoomId = function () {
  return Rooms.findOne()._id;
}

if (Meteor.isClient) {
  var onSendMessage = function () {
    var input = $('#chat input#chat-input');
    var text = input.val().trim();
    input.val('');
    sendMessage(getUser().roomId, Session.get('userId'), text);
  }
  // Start up
  Meteor.startup(function () {
    // Generate new user
    var userId = Users.insert(new User(''));
    Session.set('userId', userId);
  });

  Template.lobby.show = function () {
    return !inRoom();
  };

  Template.users.show = function () {
    return inRoom();
  }

  Template.chat.show = function () {
    return inRoom();
  }

  Template.users.users = function () {
    if (getUser() && getUser().roomId) {
      var roomId = getUser().roomId;
      var users = Rooms.findOne(roomId).users.map(function (userId) {
        return Users.findOne(userId);
      });
      return users;
    }
    return [];
  };


  Template.lobby.events({
    'keyup input#username': function (evt) {
      console.log( $('#lobby input#username').val());
      var username = $('#lobby input#username').val().trim();
      Users.update(Session.get('userId'), {$set: {name: username}});
    },
    'click button#enter': function (evt) {
      // User enters room
      var selectedRoomId = getRoomId();
      var userId = Session.get('userId');
      Users.update(userId, {$set: {roomId: selectedRoomId}});
      Rooms.update(selectedRoomId, {$push: {users: userId}});
    }
  });

  Template.chat.messages = function () {
    return Rooms.findOne(getUser().roomId).messages.map(function (message) {
      message.username = getUsername(message.user);
      return message;
    });
  };

  Template.chat.events({
    'keyup input#chat-input': function (evt) {
      if (evt.keyCode == 13) { 
        onSendMessage();
      }
    },
    'click button#send': function (evt) {
      onSendMessage();
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    initRoom();
  });
}

