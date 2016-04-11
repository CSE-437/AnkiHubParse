
var Card = Parse.Object.extend('Card',{},{});

// CardTemplate
var CardTemplate = Parse.Object.extend('CardTemplate', {}, {});
var BasicFrontSide = new Parse.Object('CardTemplate')
var BasicBackSide = new Parse.Object('CardTemplate')
BasicFrontSide.set('template', '{{Front}}');
BasicBackSide.set('template', '{{FrontSide}}<hr id=answer>{{Back}}');

// CardTypes
var CardType = Parse.Object.extend('CardType', {}, {});
var BasicCardType = new Parse.Object('CardType');
BasicCardType.set('FrontSide', BasicFrontSide);
BasicCardType.set('BackSide', BasicBackSide);

// Styling
var CardStyle = Parse.Object.extend('CardStyle', {}, {});
var BasicCardStyle = new Parse.Object('CardStyle');
BasicCardStyle.set('style', '.card {font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white;}')

module.exports.CardObject = Card;

module.exports.NewCard = function (username, did, card){
  var newCard = new Parse.Object('Card');

  var FrontSide = BasicFrontSide;
  if (card.front){
    FrontSide = new Parse.Object('CardTemplate');
    FrontSide.set('template', card.front)
    delete card.front
  }

  var BackSide = BasicBackSide;
  if (card.back){
    BackSide = new Parse.Object('BackSide');
    BackSide.set('template', card.back);
    delete card.back
  }

  var CardType = new Parse.Object('CardType');
  CardType.set('FrontSide', FrontSide);
  CardType.set('BackSide', BackSide);
  newCard.set('CardType', CardType);

  // NoteType
  newCard.set('notes', card.notes || []);

  // Style
  var style = BasicCardStyle;
  if (card.style){
    style = new Parse.Object('CardStyle');
    style.set('style', card.style)
  }
  newCard.set('style', style);

  newCard.set('tags', card.tags || []);
  newCard.set('keywords', card.keywords || []);

  newCard.set('owner', username);
  newCard.set('cid', card.cid);
  newCard.set('did', did);
  newCard.set('gid', [username,did,card.cid].join(':'));

  return newCard;
}
