// State vars
var player;
var sliderUpdater;
var shouldScroll = false;

// Utility functions
var sendMessage = function (roomId, sender, text) {
  console.log("send");
  var message = new Message(sender, text);
  Rooms.update(roomId, {$push: {messages: message}});
}

var updateVideoTitle = function (roomId, videoId) {
  $.getJSON('https://gdata.youtube.com/feeds/api/videos/' + App.getRoom().videoId + '?v=2&alt=json', function (data) {
    Rooms.update(roomId, {$set: { videoTitle: data.entry.title.$t }});
  });
}

var updateVideo = function (roomId, videoId) {
  sendAdminMessage(Session.get('roomId'), App.getUsername(Session.get('userId')) + ' changed the video');
  Rooms.update(Session.get('roomId'), 
    {$set: 
      { videoId: videoId,
        videoPlaying: false,
        videoTime: 0
      }});
}

var getVideoId = function (url) {
  var videoId;
  if (url.indexOf("v=") == -1) {
    videoId = url;
  } else {
    var split = url.split("v=");
    if (split[1].indexOf("&") != -1) {
      videoId = split[1].split("&")[0];
    } else {
      videoId = split[1];
    }
  }
  return videoId;
}

var updateTime = function () {
  if (player && player.getCurrentTime) {
    if (App.getRoom().users[0] == Session.get('userId')) {
      Meteor.call('updateVideoTime', Session.get('roomId'), player.getCurrentTime());
    }
    $("#video-slider").slider("option", "value", player.getCurrentTime());
    $("#video-slider").slider("option", "max", player.getDuration());
    if (App.getRoom().videoTime > player.getCurrentTime() + 3) {
      player.seekTo(App.getRoom().videoTime + 0.5);
      if (!App.getRoom().videoPlaying) {
        player.pauseVideo();
      }
    }
  }
};

Template.messages.rendered = function() {
  if (!this.initialized) {
    // Initialize js components in room
    var messagesBox = $('div.messages');
    messagesBox.scrollTop(messagesBox[0].scrollHeight);

    Meteor.setInterval(function () {
      if (shouldScroll) {
        messagesBox.scrollTop(messagesBox[0].scrollHeight);
        shouldScroll = false;
      }
    }, 200);

    sendAdminMessage(Session.get('roomId'), App.getUsername(Session.get('userId')) + ' entered the room');

    this.initialized = true;
  }
}

Template.chatInput.rendered = function() {
  if (!this.initialized) {
    console.log("rendered");
    $('textarea#chat-input').keypress(function (evt) {
      if (evt.keyCode == 13 && !evt.shiftKey) {
        evt.preventDefault();
      }
    });
    this.initialized = true;
  }
}

window.onbeforeunload = function () {
  // Remove the user from the room
  Rooms.update(Session.get('roomId'), {$pull: { users: Session.get('userId')}});
  sendAdminMessage(Session.get('roomId'), App.getUsername(Session.get('userId')) + ' left the room');
}

window.onYouTubeIframeAPIReady = function () {
  var roomQuery = Rooms.find(Session.get('roomId'));
  player = new YT.Player('ytplayer', {
    videoId: roomQuery.fetch()[0].videoId,
    width: '800',
    height: '450',
    playerVars: { autoplay: 0, controls: 0, showinfo: 0, iv_load_policy: 3 },
    events: {
      onReady: function (evt) {
        if (App.getRoom().videoPlaying) {
          player.playVideo();
        }
      },
      onStateChange: function (evt) {
        if (evt.data == YT.PlayerState.ENDED) {
          $('#iframe-overlay').hide();
        } else if (evt.data == YT.PlayerState.UNSTARTED) {
          $('#iframe-overlay').show();
          var videoId = getVideoId(player.getVideoUrl());
          if (videoId != App.getRoom().videoId) {
            updateVideo(Session.get('roomId'), videoId);
          }
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
      Meteor.clearInterval(sliderUpdater);
      Meteor.call('changeVideoTime', Session.get('roomId'), data.value);
      sliderUpdater = Meteor.setInterval(updateTime, 500);
    }
  });

  roomQuery.observe({
    changed: function (newState, oldState) {
      if (oldState.videoId != newState.videoId) {
        // User changed the video
        player.loadVideoById(newState.videoId, App.getRoom().videoTime, "large");
        updateVideoTitle(Session.get('roomId'));
        if (!App.getRoom().videoPlaying) {
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
        var messagesBox = $('div.messages');
        if (messagesBox.scrollTop() + messagesBox.height() > messagesBox[0].scrollHeight - 100) {
          shouldScroll = true;
        }
      }
    }
  });
}

Template.video.videoId = function () {
  return Rooms.findOne(Session.get('roomId')).videoId;
}

Template.control.isPlaying = function () {
  return App.getRoom().videoPlaying;
}

Template.control.videoProgress = function() {
  return App.getRoom().videoTime;
}

Template.info.title = function() {
  return App.getRoom().videoTitle;
}

Template.users.users = function () {
  if (App.getUser() && Session.get('roomId')) {
    var roomId = Session.get('roomId');
    var users = Rooms.findOne(roomId).users.map(function (userId) {
      return Users.findOne(userId);
    });
    return users;
  }
  return [];
};

var sendAdminMessage = function (roomId, text) {
  var message = new Message('', text, 'admin');
  Rooms.update(roomId, {$push: { messages: message }});
}

var toggleVideoPlay = function () {
  if (!App.getRoom().videoPlaying) {
    Rooms.update(Session.get('roomId'), {$set: { videoPlaying: true }});
    sendAdminMessage(Session.get('roomId'), App.getUsername(Session.get('userId')) + ' started the video');
  } else {
    Rooms.update(Session.get('roomId'), {$set: { videoPlaying: false }});
    sendAdminMessage(Session.get('roomId'), App.getUsername(Session.get('userId')) + ' paused the video');
  }
}

Template.messages.messages = function () {
  return Rooms.findOne(Session.get('roomId')).messages.map(function (message) {
    if (message.type == 'user') {
      message.username = App.getUsername(message.user);
    }
    return message;
  });
};

// Events
Template.search.events({    
  'keyup input#video-src': function (evt) {
    var input = $('input#video-src').val().trim();
    var videoId = getVideoId(input);
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

Template.chatInput.events({
  'keyup textarea#chat-input': function (evt) {
    if (evt.keyCode == 13 && !evt.shiftKey) { 
      evt.preventDefault();
      var input = $('#chat textarea#chat-input');
      var text = input.val().trim();
      input.val('');
      sendMessage(Session.get('roomId'), Session.get('userId'), text);
    }
  }
});
