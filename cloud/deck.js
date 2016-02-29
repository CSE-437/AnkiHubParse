var Deck = Parse.Object.extend("Deck",{},{});

module.exports.DeckObject = Deck;
module.exports.ValidateNewDeck = function(deck){//deck from json
  return (deck.owner && deck.did && deck.name);
}

module.exports.ValidateDeck = function(deck){
  console.log(deck.get("owner"));
  return (deck.get('owner') && deck.get('did') && deck.get('name'))
}

module.exports.NewDeckId = function(owner, did){
  return owner+":"+did;
}
