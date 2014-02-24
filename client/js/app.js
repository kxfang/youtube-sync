App = {
  getUser: function () {
    return Users.findOne(Session.get('userId'))
  },

  getUsername: function (userId) {
    return Users.findOne(userId).name;
  },

  getRoom: function () {
    return Rooms.findOne(Session.get('roomId'));
  },

  // Temporarily only support one room
  getDefaultRoomId: function () {
    return Rooms.findOne()._id;
  },

  enterRoom: function (roomId) {
    Router.go('room');
    var userId = Session.get('userId');

    Session.set('roomId', roomId);
    Rooms.update(roomId, {$push: {users: userId}});

    // Load Youtube script
    $.getScript('https://www.youtube.com/iframe_api');
  }
}

// Start up
Meteor.startup(function () {
  // Generate new user
  var userId = Users.insert(new User(''));
  Session.set('userId', userId);
});