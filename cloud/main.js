var DeckUtil = require("./deck.js");
var CardUtil = require("./card.js");

//Set did
//TODO check if saving in after Save propagates the user
Parse.Cloud.beforeSave("Deck", function(req, res){
  //First validate Deck
  var deck = req.object
  var user = req.user
  if(!user && DeckUtil.ValidateDeck(deck)){//Save called by Cloud Code
    res.success();
  }
  else if(user && DeckUtil.ValidateDeck(deck)){
    //check if card exst.
    var query = new Parse.Query("Deck");
    query.equalTo('gid', deck.get("gid"))
    query.find({
      success:function(results){
        var realDeck = results[0] || deck;
        //Set the owner of the deck
        req.object.set("owner", (realDeck.get("owner"))? user.get("owner") : user.get("username"));
        if(DeckUtil.UserHasAccess(req.object, user)){
          //console.log(req.object.get("owner"), realDeck.get("owner"), deck.get("owner"));
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
    res.error({msg: "Invalid Deck. Did you send a user?"});
  }
});

//Parse cards
Parse.Cloud.afterSave("Deck", function(req){
  var deck = req.object;
  var cards = req.object.get("newCards")

  //make it empty so that this doesn't loop
  deck.set("newCards", []);
  if(cards.length > 0){
  //console.log("Made it here", cards);

  deck.save(null,{
    success:function(){
      if(cards){
        var oldCards = []
        var newCards = []
        cards.forEach(function(card, index, arr){
          //Check if the card is a card id or a full card.
          if(card.is){
            var query = new Parse.Query("Card");
            query.equalTo("gid", card.is)
            query.find( {
              success: function(results){
                var newCard = results[0];
                if(newCard){

                  //deck.add("cids", newCard.get("gid"));
                  oldCards.push(newCard)
                  //deck.save(null, {});
                }
              }
            });
          }else{//If it is a new card create it.
            var newCard = new Parse.Object("Card");
            newCard.set("cid", card.cid);
            //console.log("made it here 1");
            newCard.set("did", deck.get("did"));
            //console.log("made it here 2", card.cid, deck.get('gid'));
            newCard.set("gid", CardUtil.NewCardId(deck.get('gid'), card.cid))
            //console.log("made it here 3");
            newCard.set("front", card.front);
            //console.log("made it here 4");
            newCard.set("back", card.back);
            //console.log("made it here 5");
            newCard.set("tags", card.tags);
            //console.log("made it here 6");
            newCard.set("notes", card.notes);
            //console.log("made it here 7");
            newCard.set("keywords", card.keywords);
            //console.log("made it here 8");
            newCard.set("owner", deck.get("owner"));
            console.log("made it here 9", newCard);
            newCards.push(newCard);

          }
        });
        Parse.Object.saveAll(newCards, {
          success: function(objs){
            console.log("hello")
            var cids = objs.map(function(c){
              return c.get("gid");
            }).concat(oldCards.map(function(c){
              return c.get("gid");
            }));
            console.log("Cids: ", cids);
            cids.forEach(function(id){
              deck.addUnique("cids",id);
            });
            deck.save({
              success: function(deck){
                console.log("Deck has been saved");
              }, error: function(err){
                console.error("Cant save Deck");
              }
            });
          },error: function(error){
            console.error("error",error)
          }
        })
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
  if(CardUtil.ValidateCard(card)){
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
