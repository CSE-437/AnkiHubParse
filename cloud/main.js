var DeckUtil = require("./deck.js");
var CardUtil = require("./card.js");

//Set did
Parse.Cloud.beforeSave("Deck", function(req, res){
  //First validate Deck
  var deck = req.object
  var user = req.user
  if(!user){
    res.error({msg: "Decks Must have a user"})
  }
  else if(DeckUtil.ValidateDeck(deck)){
    //check if card exst.
    var query = new Parse.Query("Deck");
    query.equalTo('gid', deck.get("gid"))
    query.find({
      success:function(results){
        var realDeck = results[0] || deck;
        //Set the owner of the deck
        realDeck.set("owner", realDeck.get("owner") || user.get("username"));
        if(DeckUtil.UserHasAccess(deck, user)){
          res.success();
        }else{
          res.error({msg:"User doesn't have access to this deck"});
        }
      }, error: function(result, error){
        res.error(error)
      }
    })
    res.success()

  }else{
    res.error({msg: "Invalid Deck"});
  }
});

//Parse cards
Parse.Cloud.afterSave("Deck", function(req){
  var deck = req.object;
  var cards = req.object.get("newCards")
  //make it empty so that this doesn't loop
  deck.set("newCards", []);
  if(cards.length > 0){


  deck.save(null,{
    success:function(){
      if(cards){
        cards.forEach(function(card, index, arr){
          //Check if the card is a card id or a full card.
          if(card.is){
            var query = new Parse.Query("Card");
            query.equalTo("gid", card.is)
            query.find( {
              success: function(results){
                var newCard = results[0];
                if(newCard){

                  deck.add("cids", newCard.get("gid"));
                  deck.add("cards", newCard);
                  deck.save(null, {});
                }
              }
            });
          }else{//If it is a new card create it.
            var newCard = new CardObject();
            newCard.set("cid", card["cid"]);
            newCard.set("did", deck.get("did"));
            newCard.set("gid", newCardId(deck.get('gid'), card["cid"]))
            newCard.set("front", card["front"]);
            newCard.set("back", card["back"]);
            newCard.set("tags", card["tags"]);
            newCard.set("notes", card["notes"]);
            newCard.set("keywords", card["keywords"]);
            newCard.set("owner", deck.get("owner"));
            newCard.save(null, {
              success:function(savedCard){
                deck.add("cids", savedCard.get("gid"));
                deck.add("cards", savedCard);
                deck.save(null, {});
              }, error: function(savedCard, error){
                console.error("Could not save card: "+card.get('gid'));
              }
            })
          }
        });
      }
    },
    error:function(){
      console.error("Could not add new cards");
    }
  });
}

});

//Set cardid
Parse.Cloud.beforeSave("Card", function(req, res){
  //First validate Deck
  var card = req.object
  if(CardUtil.ValidateCard(deck)){
    //Parse all the cards.
    deck.set("gid", CardUtil.NewCardId(card.get("did"), card.get("cid")))
    res.success()

  }else{
    res.error({msg: "Invalid Card"});
  }
});

//TODO : Implement transaction parsing
Parse.Cloud.beforeSave("Transaction", function(req, res){
  //First validate Deck
  res.success()

});


//Add functions for SAQL
