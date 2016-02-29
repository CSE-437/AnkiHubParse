var Card = Parse.Object.extend("Card",{},{});

module.exports.CardObject = Card;
//Validates and Object
module.exports.ValidateNewCard = function(card){//deck from json
  return (card.owner && card.did && card.cid);
}
//Validates a Parse Object that is a Card
module.exports.ValidateCard = function(card){
  return (card.get('owner') && card.get('did')  && card.get('cid'))
}

module.exports.NewCardId = function(did, cid){
  return did+":"+cid;
}
