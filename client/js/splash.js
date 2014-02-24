var isValidUsername = function (username) {
  return username == 'Di' || username == 'Kevin';
}

Template.splash.events({
  'keyup input#username': function (evt) {
    var username = $('#splash input#username').val().trim();
    if (username == 'secreticecreamstash') {
      username = "Di";
      Users.update(Session.get('userId'), {$set: {name: username}});
    } else if (username == 'kevin') {
      username = "Kevin"
      Users.update(Session.get('userId'), {$set: {name: username}});
    }
    if (evt.keyCode == 13 && isValidUsername(username)) {
      App.enterRoom(App.getDefaultRoomId());
    }
  },
  'click button#enter': function (evt) {
    // User enters room
    if (isValidUsername(App.getUsername(Session.get('userId')))) {
      App.enterRoom(App.getDefaultRoomId());
    }
  }
});