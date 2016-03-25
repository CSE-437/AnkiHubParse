var Card = Parse.Object.extend("Card",{},{});

module.exports.CardObject = Card;
//Validates and Object
module.exports.ValidateNewCard = function(card){//deck from json
  return (card.owner && card.gid && card.did && card.cid);
}
//Validates a Parse Object that is a Card
module.exports.ValidateCard = function(card){
  return (card.get('owner') && card.get('did')  && card.get('cid'))
}

module.exports.NewCard = function(username, did, card){
  var newCard = new Parse.Object("Card");
  Object.keys(card).forEach(function(key){return newCard.set(key, card[key])});
  newCard.set("owner", username);
  newCard.set("cid", card.cid);
  newCard.set("did", did);
  newCard.set("gid", [username,did,card.cid].join(':'))
  return newCard;
}
