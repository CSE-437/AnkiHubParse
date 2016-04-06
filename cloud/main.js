var DeckUtil = require('./deck.js');
var CardUtil = require('./card.js');
var TUtil = require('./transaction.js')

// Set did
// TODO check if saving in after Save propagates the user
Parse.Cloud.beforeSave('Deck', function(req, res){
  // First validate Deck
  var deck = req.object
  var user = req.user
   if(!user){
     return res.error({error: 'Invalid Deck. Did you send a user?', user:user});
   }
  if(DeckUtil.ValidateDeck(deck)){// Save called by Cloud Code
    console.log('Validated Deck Before Synching');
    var cards = req.object.get('newCards');
    if (!deck.get('owner')){
      deck.set('owner', user.get('username'));
    }
    if (!deck.get('gid')){
      deck.set('gid', [user.get('username'), deck.get('did')].join(':'));
    }
    deck.unset('newCards');
    if(cards && cards.length > 0){
      var oldCards = [];
        var newCards = [];
        cards.forEach(function(card, index, arr){
          if(card.is){
            oldCards.push(card.is);
          }else{// If it is a new card create it.

            var newCard = CardUtil.NewCard(user.get('username'), deck.get('did'), card);
            newCards.push(newCard);
          }
        });

        Parse.Object.saveAll(newCards, {
          success: function(objs){
            console.log("here 3");
            var cids = objs.map(function(c){
              return c.get('gid');
            }).concat(oldCards.map(function(id){
              return id;
            }));
            if (!deck.get('cids')){
              deck.set('cids', []);
            }
            cids.forEach(function (id){
              deck.addUnique('cids', id);
            });

            if (!deck.get('cards')){
              deck.set('cards', []);
            }
            objs.forEach(function (c){ deck.addUnique('cards', c);});
            res.success();

          },error: function(cards, err){
            console.log('Invalid Deck, Bad Cards')
            res.error({ error: err, cards: cards, message:'Invalid Deck, Bad Cards'});
          }, sessionToken: user.get('sessionToken')
//          sessionToken: user.get('sessionToken'),
        });

    }else{
      return res.success();
    }
  }else{
    console.log('Deck is Invalid')
    return res.error({error:'Invalid Deck'});
  }
});



function ApplyTransactionToUser(t, user, errorCB, successCB){
  var delaySave = false;
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
      //delaySave = true;
    if(!user.get('subscriptions')){
      user.set('subscriptions', []);
    }

      var tSub = TUtil.NewTransaction({
        query: 'aSUBSCRIBER',
        data: { username: user.get('username') },
        on: t.get('data').gid,
        for: 'Deck',
        owner: user.get('username'),
        indexGroup: t.get('indexGroup'),
        index: t.get('index'),
      });
      delaySave = true
      tSub.save(null,{
        success: function(){
          user.addUnique('subscriptions', t.get('data').gid);
          user.save(null,{
            success: successCB,
            error: errorCB,
            sessionToken: user.get('sessionToken')
          })
        },
        error: errorCB,
        sessionToken: user.get('sessionToken')
      });
    break;

    case 'rSUBSCRIPTION':
    if(!user.get('subscriptions')){
      user.set('subscriptions', []);
    }
    var tSub = TUtil.NewTransaction({
      query: 'rSUBSCRIBER',
      data: { username: user.get('username') },
      on: t.get('data').gid,
      for: 'Deck',
      owner: user.get('username'),
      indexGroup: t.get('indexGroup'),
      index: t.get('index'),
    });
    delaySave = true
    tSub.save(null,{
      success: function (){
        user.remove('subscriptions', t.get('data').gid);
        user.save(null, {
          success: successCB,
          error: errorCB,
          sessionToken: user.get('sessionToken')
        })
      },
      error: errorCB,
      sessionToken: user.get('sessionToken')
    });

    break;

  }
  if(!delaySave){

    user.save(null,{
      success: function (){ successCB()},
      error: function (user, error){ errorCB(error)},
      sessionToken: user.get('sessionToken')
    });
  }
}

function ApplyTransactionToDeck (t, user, errorCB, successCB, res){
  if(t.get('query') === 'FORK'){
    // Make sure deck is public
    if(!(TUtil.UserHasAccess(t, user))){
      return errorCB({error: 'User does not have access'}, t);
    }
    var query = new Parse.Query('Deck')
    query.equalTo('gid', t.get('on'))
    query.find({
      success:function (results){
        var original = results[0];
        if(original){
          var forked = new Parse.Object('Deck');
          forked.set('name', original.get('name'));
          forked.set('keywords', original.get('keywords'));
          forked.set('desc', original.get('desc'));
          forked.set('isPublic', original.get('isPublic'));
          forked.set('children', original.get('children'));
          forked.set('owner', user.get('username'));
          forked.set('gid', (DeckUtil.NewDeckId(user.get('username'), original.get('did'))));
          forked.set('did', original.get('did'));
          forked.set('cids', original.get('cids'));
          forked.save(null, {
            success:successCB,
            error:function(user, err){errorCB(err)},
            sessionToken: user.get('sessionToken')
          });
        }else{
          errorCB({error: 'Failed to Find Deck with given deckid', transaction: t})
        }
      }, error: function(user, err){errorCB(err)}
    })

  }else{
    //GET The Deck.
    if(!(TUtil.UserHasAccess(t, user))){
      return errorCB({error: 'User does not have access'}, t);
    }
    var query = new Parse.Query('Deck')
    query.equalTo('gid', t.get('on'))
    query.find({
      success: function(results){
        var deck = results[0];
        if(deck){

          switch(t.get('query')){
            case 'REDESC':
            deck.set('description', t.get('data').description);
            break;

            case 'RENAME':
            deck.set('name', t.get('data').name);
            break;

            case 'REMOVE':
            deck.remove('cids', t.get('data').gid);
            break;

            case 'ADD':
            deck.set('newCards', [t.get('data')]);
            break;

            case 'aSUBSCRIBER':
              if(!deck.get('subscribers')){

                deck.set('subscribers', []);
              }

              deck.addUnique('subscribers', t.get('data').username);
            break;

            case 'rSUBSCRIBER':
              if(!deck.get('subscribers')){
                deck.set('subscribers', []);
              }
              deck.remove('subscribers', t.get('data').username);

            break;

            case 'DELETE':
            if(deck.get('owner') === user.get('username')){

              return deck.destroy({
                success: successCB,
                error: function(user, err){errorCB(err)}
              });
            }
            break;

            case 'aKEYWORDS':
              t.get('data').keywords.forEach(function(word){
                deck.addUnique('keywords', word)
              });
            break;

            case 'rKEYWORDS':
            t.get('data').keywords.forEach(function(word){
              deck.remove('keywords', word)
            });
            break;

            case 'cKEYWORDS':
            t.get('data').keywords.forEach(function(word){
              deck.unset('keywords')
            });
            break;

            case 'REPUB':
            deck.set('isPublic', t.get('isPublic'))
            break;

            case 'aCOLLABORATOR':
            deck.addUnique('collaborators', user);
            break;

            case 'rCOLLABORATOR':
            deck.remove('collaborators', user);
            break;
          }

          deck.save(null, {
            success:function(deck){
              successCB()
            },
            error:function(user, err){errorCB(err)},
            sessionToken: user.get('sessionToken')
          })
        }else{
            errorCB({error: 'Failed to Find Deck with given deckid', transaction: t})
        }
      },
      error: function(user, err){errorCB(err)}
    });
  }

}

Parse.Cloud.beforeSave('Transaction', function(req, res){
  if (req.object.get('done')){
    return res.success();
  }
  var didParse = TUtil.ParseTransaction(req.object)
  if (didParse.error){
    return res.error(didParse.error)
  }
  //console.log('here1')
  var t = didParse.transaction
  //Ensure req.object is the same
  req.object = t;
  var user = req.user;
  console.log('user = ', user);
  if (!t.get('owner')){
    t.set('owner', user.get('username'))
  }
  if(!user){
    return res.error({error:'Need to be logged in to post transaction'});
  }
  t.set('done', true);
  switch(t.get('for')){
    case 'User':

      console.log('here2')
      ApplyTransactionToUser(t, user, res.error, res.success);
    break;
    case 'Deck':
      ApplyTransactionToDeck(t, user, res.error, res.success, res)
    break;
    default:
      res.error({error:'Invalid Transaction check for field \'for\'', transaction: t});
  }

});
