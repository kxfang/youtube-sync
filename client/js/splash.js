Template.splash.events({
  'keyup input#username': function (evt) {
    var username = $('#splash input#username').val().trim();
    Users.update(Session.get('userId'), {$set: {name: username}});

    if (evt.keyCode == 13) {
      App.enterRoom(App.getDefaultRoomId());
    }
  },
  'click button#enter': function (evt) {
    // User enters room
    App.enterRoom(App.getDefaultRoomId());
  }
});