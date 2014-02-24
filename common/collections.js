// Collections
Rooms = new Meteor.Collection("rooms");
Users = new Meteor.Collection("users");

// Objects
Room = function () {
  this.users = [];
  this.messages = [];
  this.videoId = 'jofNR_WkoCE';
  this.videoTitle = 'What Does the Fox Say';
  this.videoPlaying = false;
  this.videoTime = 0;
}

User = function (name) {
  this.name = name;
}

Message = function (user, text, type) {
  this.type = type ? type : 'user';
  this.user = user;
  this.text = text;
}
