Rooms = new Meteor.Collection("rooms");
Users = new Meteor.Collection("users");

// Objects
var Room = function () {
  this.users = [];
  this.messages = [];
  this.videoId = '#';
  this.videoPlaying = false;
  this.videoTime = 0;
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

var getRoom = function () {
  return Rooms.findOne(Session.get('roomId'));
}

var inRoom = function () {
  return Session.get('roomId');
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

var updateVideo = function (roomId, videoId) {
  Rooms.update(Session.get('roomId'), 
    {$set: 
      { videoId: videoId,
        videoPlaying: false,
        videoTime: 0
      }});
}



if (Meteor.isClient) {
  var player;
  var sliderUpdater;

  var updateTime = function () {
    if (player && player.getCurrentTime) {
      if (getRoom().users[0] == Session.get('userId')) {
        Meteor.call('updateVideoTime', Session.get('roomId'), player.getCurrentTime());
      }
      $("#video-slider").slider("option", "value", player.getCurrentTime());
      $("#video-slider").slider("option", "max", player.getDuration());
      if (getRoom().videoTime > player.getCurrentTime() + 3) {
        player.seekTo(getRoom().videoTime + 0.5);
        if (!getRoom().videoPlaying) {
          player.pauseVideo();
        }
      }
    }
  };

  window.onbeforeunload = function () {
    // Remove the user from the room
    Rooms.update(Session.get('roomId'), {$pull: { users: Session.get('userId')}});
  }

  window.onYouTubeIframeAPIReady = function () {
    var roomQuery = Rooms.find(Session.get('roomId'));
    player = new YT.Player('ytplayer', {
      videoId: roomQuery.fetch()[0].videoId,
      width: '640',
      height: '390',
      playerVars: { autoplay: 0, controls: 0 },
      events: {
        onReady: function (evt) {
          if (getRoom().videoPlaying) {
            player.playVideo();
          }
        }
      }
    });

    $( "#video-slider" ).slider({
      range: 'min',
      min: 0,
      max: 100,
      slide: function (evt, data) {
        // Rooms.update(Session.get('roomId'), {$set: { videoTime: data.value }});
      },
      create: function (evt, data) {
        sliderUpdater = Meteor.setInterval(updateTime, 500);
      },
      stop: function (evt, data) {
        console.log("stop");
        Meteor.clearInterval(sliderUpdater);
        Meteor.call('changeVideoTime', Session.get('roomId'), data.value);
        sliderUpdater = Meteor.setInterval(updateTime, 500);
      }
    });


    roomQuery.observe({
      changed: function (newState, oldState) {
        if (oldState.videoId != newState.videoId) {
          // User changed the video
          player.loadVideoById(newState.videoId, getRoom().videoTime, "large");
          if (!getRoom().videoPlaying) {
            player.pauseVideo();          
          }
        } else if (oldState.videoPlaying != newState.videoPlaying) {
          if (!oldState.videoPlaying && newState.videoPlaying) {
            player.playVideo();
            $("#video-slider").slider("option", "max", player.getDuration());
          } else if (oldState.videoPlaying && !newState.videoPlaying) {
            player.pauseVideo();
          }
        } else if (oldState.videoTime > newState.videoTime || oldState.videoTime < newState.videoTime - 2) {
          Meteor.clearInterval(sliderUpdater);
          player.seekTo(newState.videoTime);
          sliderUpdater = Meteor.setInterval(updateTime, 500);
        }
      }
    });
  }

  var onSendMessage = function () {
    var input = $('#chat input#chat-input');
    var text = input.val().trim();
    input.val('');
    sendMessage(Session.get('roomId'), Session.get('userId'), text);
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

  Template.video.show = function () {
    return inRoom();
  }

  Template.video.videoId = function () {
    return Rooms.findOne(Session.get('roomId')).videoId;
  }

  Template.control.isPlaying = function () {
    return getRoom().videoPlaying;
  }

  Template.control.videoProgress = function() {
    return getRoom().videoTime;
  }

  Template.users.users = function () {
    if (getUser() && Session.get('roomId')) {
      var roomId = Session.get('roomId');
      var users = Rooms.findOne(roomId).users.map(function (userId) {
        return Users.findOne(userId);
      });
      return users;
    }
    return [];
  };


  Template.lobby.events({
    'keyup input#username': function (evt) {
      var username = $('#lobby input#username').val().trim();
      Users.update(Session.get('userId'), {$set: {name: username}});
    },
    'click button#enter': function (evt) {
      // User enters room
      var selectedRoomId = getRoomId();
      var userId = Session.get('userId');
      // Users.update(userId, {$set: {roomId: selectedRoomId}});
      Session.set('roomId', selectedRoomId);
      Rooms.update(selectedRoomId, {$push: {users: userId}});
          // Load Youtube script
      $.getScript('https://www.youtube.com/iframe_api');

    }
  });

  Template.chat.messages = function () {
    return Rooms.findOne(Session.get('roomId')).messages.map(function (message) {
      message.username = getUsername(message.user);
      return message;
    });
  };

  Template.video.events({
    'keyup input#video-src': function (evt) {
      console.log("asdf");
      updateVideo(Session.get('roomId'), $('#video input#video-src').val().trim());
    }
  });

  Template.control.events({
    'click button#video-play': function (evt) {
      if (!getRoom().videoPlaying) {
        Rooms.update(Session.get('roomId'), {$set: { videoPlaying: true }});
      } else {
        Rooms.update(Session.get('roomId'), {$set: { videoPlaying: false }});
        // syncPlayerTimes();
      }
    }
  });

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

