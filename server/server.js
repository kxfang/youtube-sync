Meteor.methods({
  updateVideoTime: function (roomId, time) {
    if (Math.abs(time - Rooms.findOne(roomId).videoTime) < 3) {
      Rooms.update(roomId, {$set: { videoTime: time }});
    }
  },
  changeVideoTime: function (roomId, time) {
    Rooms.update(roomId, {$set: { videoTime: time }});
  }
})

// Function to auto-create a room on start up
// Temporary hack until we support multiple rooms
var resetRoom = function () {
  Rooms.remove({});
  Rooms.insert(new Room());
}

Meteor.startup(function () {
  resetRoom();
  Meteor.setInterval(function () {
    var room = Rooms.findOne();
    if (room.users.length == 0) {
      resetRoom();
    }
  }, 10000);
});
