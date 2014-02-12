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