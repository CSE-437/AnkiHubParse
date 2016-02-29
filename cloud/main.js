var DeckUtil = require("./deck.js");
var CardUtil = require("./card.js");

//Set did
Parse.Cloud.beforeSave("Deck", function(req, res){
  //First validate Deck
  var deck = req.object
  if(DeckUtil.ValidateDeck(deck)){
    //Parse all the cards.
    deck.set("gid", DeckUtil.NewDeckId(deck.get("owner"), deck.get("did")))
    res.success()

  }else{
    res.error({msg: "Invalid Deck"});
  }
});

//Parse cards
Parse.Cloud.afterSave("Deck", function(req){
  var deck = req.object;
  var cards = req.object.get("newCards")
  deck.set("newCards", []);
  if(cards.length > 0){


  deck.save(null,{
    success:function(){
      if(cards){
        cards.forEach(function(card, index, arr){
          //Check if the card is a card id or a full card.
          if(card.is){
            var query = new Parse.Query("Card");
            query.equalTo("cid", card.is)
            query.find( {
              success: function(results){
                deck.add("cids", results[0].get("cid"));
                deck.add("cards", results[0]);
                deck.save(null, {
                  success:function(savedCard){
                    //TODO fillin
                  }, error:function(savedCard, error){
                    //TODO fillin
                  }
                });
              }, error:function(){
                console.error( "No card with id: " + card["is"]);
              }
            });
          }else{//If it is a new card create it.
            var newCard = new CardObject();
            newCard.set("cid", card["cid"]);
            newCard.set("did", deck.get("did"));
            newCard.set("gid", newCardId(req.object.get("gid"), card["cid"]))
            newCard.set("front", card["front"]);
            newCard.set("back", card["back"]);
            newCard.set("tags", card["tags"]);
            newCard.set("notes", card["owner"]);
            newCard.set("keywords", card["keywords"]);
            newCard.set("owner", req.object.get("owner"));
            newCard.save(null, {
              success:function(savedCard){
                deck.add("cids", savedCard.get("cid"));
                deck.add("cards", savedCard);
                deck.save(null, {
                  success:function(savedCard){
                    //TODO fillin
                  }, error:function(savedCard, error){
                    //TODO fillin
                  }
                });
              }, error: function(savedCard, error){
                console.error("Could not save card: "+card["cid"]);
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


//Add functions for SAQL
