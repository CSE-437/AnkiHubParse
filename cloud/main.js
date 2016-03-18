var DeckUtil = require("./deck.js");
var CardUtil = require("./card.js");
var TUtil = require("./transaction.js")

//Set did
//TODO check if saving in after Save propagates the user
Parse.Cloud.beforeSave("Deck", function(req, res){
  //First validate Deck
  var deck = req.object
  var user = req.user
  if(!user){
    return res.error({error: "Invalid Deck. Did you send a user?", user:user});
  }
  if(DeckUtil.ValidateDeck(deck)){//Save called by Cloud Code
    return res.success();
  }
  return res.error({error:"Invalid Deck"})
});

//Parse cards
Parse.Cloud.afterSave("Deck", function(req){
  var deck = req.object;
  var cards = req.object.get("newCards")

  //make it empty so that this doesn't loop
  deck.unset("newCards");
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
    res.error({error: "Invalid Card"});
  }
});



function ApplyTransactionToDeck(t, user, errorCB, successCB, res){
  if(t.get("query") === "FORK"){
    //Make sure deck is public
    if(!(TUtil.UserHasAccess(t, user))){
      return errorCB({error: "User does not have access"}, t);
    }
    var query = new Parse.Query("Deck")
    query.equalTo('gid', t.get("on"))
    query.find({
      success:function(results){
        var original = results[0];
        if(original){
          var forked = new Parse.Object("Deck");
          forked.set("name", original.get("name"));
          forked.set("keywords", original.get("keywords"));
          forked.set("desc", original.get("desc"));
          forked.set("isPublic", original.get("isPublic"));
          forked.set("children", original.get("children"));
          forked.set("owner", user.get("username"));
          forked.set("gid", (DeckUtil.NewDeckId(user.get("username"), original.get("did"))));
          forked.set("did", original.get("did"));
          forked.set("cids", original.get("cids"));
          forked.save(null, {
            success:successCB,
            error:errorCB
          });
        }else{
          errorCB({error: "Failed to Find Deck with given deckid", transaction: t})
        }
      }, error: errorCB
    })

  }else{
    //GET The Deck.
    if(!(TUtil.UserHasAccess(t, user))){
      return errorCB({error: "User does not have access"}, t);
    }
    var query = new Parse.Query("Deck")
    query.equalTo('gid', t.get("on"))
    query.find({
      success: function(results){
        var deck = results[0];
        if(deck){

          switch(t.get("query")){
            case "REDESC":
            deck.set("description", t.get("data").description);
            break;

            case "RENAME":
            deck.set("name", t.get("data").name);
            break;

            case "REMOVE":
            deck.remove("cids", t.get("data").gid);
            break;

            case "ADD":
            deck.set("newCards", [t.data]);
            break;

            case "DELETE":
            if(deck.get("owner") === user.get("username")){

              return deck.destroy({
                success: successCB,
                error: errorCB
              });
            }
            break;

            case "aKEYWORDS":
              t.get("data").keywords.forEach(function(word){
                deck.addUnique("keywords", word)
              });
            break;

            case "rKEYWORDS":
            t.get("data").keywords.forEach(function(word){
              deck.remove("keywords", word)
            });
            break;

            case "cKEYWORDS":
            t.get("data").keywords.forEach(function(word){
              deck.unset("keywords")
            });
            break;

            case "REPUB":
            deck.set("isPublic", t.get("isPublic"))

          }

          deck.save(null, {
            success:function(deck){
              successCB()
            },
            error:function(error){
              errorCB(error);
            },
            sessionToken: user.get("sessionToken")
          })
        }else{
            errorCB({error: "Failed to Find Deck with given deckid", transaction: t})
        }
      },
      error: errorCB
    });
  }

}

Parse.Cloud.beforeSave("Transaction", function(req, res){
  //First validate Deck
  console.log("here0", req.object)
  var didParse = TUtil.ParseTransaction(req.object)
  console.log("here1")
  if (didParse.error){
    return res.error(didParse)
  }
  var t = didParse.transaction
  console.log("here2");
  //Ensure req.object is the same
  req.object = t;
  var user = req.user
  if(!user){
    res.error({error:"Need to be logged in to post transaction"});
  }
  switch(t.get("for")){
    case "Deck":
      ApplyTransactionToDeck(t, user, res.error, res.success, res)
    break;
    default:
      res.error({error:"Invalid Transaction check for field \"for\"", transaction: t});
  }

});
