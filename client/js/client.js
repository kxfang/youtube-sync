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

var getRoomId = function () {
  return Rooms.findOne()._id;
}

var updateVideoTitle = function (roomId, videoId) {
  $.getJSON('http://gdata.youtube.com/feeds/api/videos?alt=json&q=' + getRoom().videoId, function (data) {
    Rooms.update(roomId, {$set: { videoTitle: data.feed.entry[0].title.$t }});
  });
}

var updateVideo = function (roomId, videoId) {
  Rooms.update(Session.get('roomId'), 
    {$set: 
      { videoId: videoId,
        videoPlaying: false,
        videoTime: 0
      }});
}

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
    width: '800',
    height: '450',
    playerVars: { autoplay: 0, controls: 0, showinfo: 0 },
    events: {
      onReady: function (evt) {
        if (getRoom().videoPlaying) {
          player.playVideo();
        }

        updateVideoTitle(Session.get('roomId'));
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
      Meteor.clearInterval(sliderUpdater);
      Meteor.call('changeVideoTime', Session.get('roomId'), data.value);
      sliderUpdater = Meteor.setInterval(updateTime, 500);
    }
  });

  var shouldScroll = true;
  
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
      } else if (oldState.messages.length < newState.messages.length) {
        if (messagesBox.scrollTop() + messagesBox.height() > messagesBox[0].scrollHeight - 100) {
          shouldScroll = true;
        }
      }
    }
  });

  // Initialize js components in room
  var messagesBox = $('div.messages');
  messagesBox.scrollTop(messagesBox[0].scrollHeight);

  Meteor.setInterval(function () {
    if (shouldScroll) {
      messagesBox.scrollTop(messagesBox[0].scrollHeight);
      shouldScroll = false;
    }
  }, 200);

  $('textarea#chat-input').keypress(function (evt) {
    if (evt.keyCode == 13 && !evt.shiftKey) {
      evt.preventDefault();
    }
  });
}

var onSendMessage = function () {
  var input = $('#chat textarea#chat-input');
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

Template.room.show = function () {
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

Template.info.title = function() {
  return getRoom().videoTitle;
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

var sendAdminMessage = function (roomId, text) {
  var message = new Message('', text, 'admin');
  Rooms.update(roomId, {$push: { messages: message }});
}

var toggleVideoPlay = function () {
  if (!getRoom().videoPlaying) {
    Rooms.update(Session.get('roomId'), {$set: { videoPlaying: true }});
    sendAdminMessage(Session.get('roomId'), getUsername(Session.get('userId')) + ' started the video');
  } else {
    Rooms.update(Session.get('roomId'), {$set: { videoPlaying: false }});
    sendAdminMessage(Session.get('roomId'), getUsername(Session.get('userId')) + ' paused the video');
  }
}

Template.messages.messages = function () {
  return Rooms.findOne(Session.get('roomId')).messages.map(function (message) {
    if (message.type == 'user') {
      message.username = getUsername(message.user);
    }
    return message;
  });
};

Template.search.events({    
  'keyup input#video-src': function (evt) {
    var input = $('input#video-src').val().trim();
    var videoId;
    if (input.indexOf("v=") == -1) {
      videoId = input;
    } else {
      var split = input.split("v=");
      if (split[1].indexOf("&") != -1) {
        videoId = split[1].split("&")[0];
      } else {
        videoId = split[1];
      }
    }
    sendAdminMessage(Session.get('roomId'), getUsername(Session.get('userId')) + ' changed the video');
    updateVideo(Session.get('roomId'), videoId);    
  }
}); 

Template.video.events({
  'click div#iframe-overlay': function (evt) {
    toggleVideoPlay();
  }
});

Template.control.events({
  'click div#video-play': function (evt) {
    toggleVideoPlay();
  }
});

Template.chat.events({
  'keyup textarea#chat-input': function (evt) {
    if (evt.keyCode == 13 && !evt.shiftKey) { 
      evt.preventDefault();
      onSendMessage();
    }
  }
});
