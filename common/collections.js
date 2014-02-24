// Collections
Rooms = new Meteor.Collection("rooms");
Users = new Meteor.Collection("users");

// Objects
Room = function () {
  this.users = [];
  this.messages = [];
  this.videoId = '-hNOcF2Cogo';
  this.videoTitle = 'Joanna Wang - I Love You';
  this.videoPlaying = true;
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
