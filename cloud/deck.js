var Deck = Parse.Object.extend("Deck",{},{});

module.exports.DeckObject = Deck;
module.exports.ValidateNewDeck = function(deck){//deck from json
  return (deck.gid && deck.did && deck.name && deck.owner);
}

module.exports.ValidateDeck = function(deck){
  return (deck.get('gid') && deck.get('did') && deck.get('name') && deck.get("owner"))
}

module.exports.NewDeckId = function(owner, did){
  return owner+":"+did;
}

module.exports.DeckExist = function(deck){

}

module.exports.UserHasAccess = function(deck, user){
  return (deck.get("owner") == user.get("username")) || (deck.get("collaborators").indexOf(user.get("username")) > -1)
}
