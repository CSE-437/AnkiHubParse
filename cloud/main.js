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
    var cards = req.object.get("newCards");
    //make it empty so that this doesn't loop
    deck.unset("newCards");
    if(cards.length > 0){
      var oldCards = [];
        var newCards = [];
        cards.forEach(function(card, index, arr){
          if(card.is){
            oldCards.push(card.is);
          }else{//If it is a new card create it.
            var newCard = new Parse.Object("Card");
            Object.keys(card).forEach(function(key){return newCard.set(key, card[key])});
            newCard.set("owner", user.get('username'));
            newCard.set("cid", card.cid);
            console.log("made it here 1");
            newCard.set("did", deck.get("did"));
            console.log("made it here 2", card.cid, deck.get('gid'));
            newCard.set("gid", CardUtil.NewCardId(deck.get('gid'), card.cid))

            newCards.push(newCard);
            console.log('here 2.5')
          }
        });
        console.log('here 2.6', newCards);
        //Crashes here, why?
        Parse.Object.saveAll(newCards, {
          success: function(objs){
            console.log('here 2.7')
            var cids = objs.map(function(c){
              return c.get("gid");
            }).concat(oldCards.map(function(id){
              return id;
            }));
            cids.forEach(function(id){
              deck.addUnique("cids",id);
            });
            console.log('here 3')
            res.success();

          },error: function(error){
            console.log('here 4')
            res.error({error:"Invalid Deck"});
          }
        });
      console.log("here after 2");
    }else{
      console.log('here 5')
      return res.success();
    }
  }else{
    console.log('here 6')
    return res.error({error:"Invalid Deck"});
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

function ApplyTransactionToUser(t, user, errorCB, successCB){

  switch(t.get('query')){
    case 'aDECK':

      if(!user.get('decks')){
        user.set('decks', []);
      }
      user.addUnique('decks', t.get('data').gid);

    break;

    case 'rDECK':
      if(!user.get('decks')){
        user.set('decks', []);
      }
      user.remove('decks', t.get('data').gid);
    break;

    case 'aSUBSCRIPTION':
    if(!user.get('subscriptions')){
      user.set('subscriptions', []);
    }
      user.addUnique('subscriptions', d);
    break;

    case 'rSUBSCRIPTION':
    if(!user.get('subscriptions')){
      user.set('subscriptions', []);
    }
    user.remove('subscriptions', d);

    break;

  }
  //console.log('here 5')
  user.save(null,{
    success: function(){ successCB()},
    error: function(user, error){ errorCB(error)},
    sessionToken: user.get('sessionToken')
  });
}

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
            error:function(user, err){errorCB(err)},
            sessionToken: user.get('sessionToken')
          });
        }else{
          errorCB({error: "Failed to Find Deck with given deckid", transaction: t})
        }
      }, error: function(user, err){errorCB(err)}
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
                error: function(user, err){errorCB(err)}
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
            break;

            case "aCOLLABORATOR":
            deck.addUnique('collaborators', user);
            break;

            case "rCOLLABORATOR":
            deck.remove('collaborators', user);
            break;
          }

          deck.save(null, {
            success:function(deck){
              successCB()
            },
            error:function(user, err){errorCB(err)},
            sessionToken: user.get("sessionToken")
          })
        }else{
            errorCB({error: "Failed to Find Deck with given deckid", transaction: t})
        }
      },
      error: function(user, err){errorCB(err)}
    });
  }

}

Parse.Cloud.beforeSave("Transaction", function(req, res){
  //First validate Deck
  //console.log('here1');
  var didParse = TUtil.ParseTransaction(req.object)
  if (didParse.error){
    return res.error(didParse.error)
  }
  //console.log('here1')
  var t = didParse.transaction
  //Ensure req.object is the same
  req.object = t;
  var user = req.user;
  //console.log('here 1.5', user);
  if(!user){
    return res.error({error:"Need to be logged in to post transaction"});
  }else{
    //console.log('here b', user);
  }
  switch(t.get("for")){
    case "User":

      console.log('here2')
      ApplyTransactionToUser(t, user, res.error, res.success);
    break;
    case "Deck":
      ApplyTransactionToDeck(t, user, res.error, res.success, res)
    break;
    default:
      res.error({error:"Invalid Transaction check for field \"for\"", transaction: t});
  }

});
