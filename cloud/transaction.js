/*

*/

var USER_QUERIES = [
  "aSUBSCRIPTION",
  "rSUBSCRIPTION",
  "aDECK",
  "rDECK",
];

var DECK_QUERIES = [
  "FORK",
  "ADD",
  "REMOVE",
  "RENAME",
  "REDESC",
  "GETACTIONS",
  "DELETE",
  "aKEYWORDS",
  "rKEYWORDS",
  "cKEYWORDS",//TODO : fIGURE OUT WHAT THIS MEANS
  "REPUB",
  "aCOLLABORATOR",
  "rCOLLABORATOR",
  "aSUBSCRIBER",
  "rSUBSCRIBER"
];

var CARD_QUERIES = [
  "UPDATE",
  "aKEYWORDS",
  "rKEYWORDS",
  "cKEYWORDS",
  "aNOTES",
  "rNOTES",
  "cNOTES",
  "aTAGS",
  "rTAGS",
  "cTAGS",
  "GETACTIONS",
  "aCOLLABORATOR",
  "rCOLLABORATOR"
];

function ValidateQuery(queryString, obj){
  switch (obj.get("for")) {
    case "User":
      return USER_QUERIES.includes(queryString);
      break;
    case "Deck":
      return DECK_QUERIES.includes(queryString);
      break;
    case "Card":
      return CARD_QUERIES.includes(queryString);
      break;
    default:
      return false
  }
}
var Transaction = Parse.Object.extend("Transaction",{},{});

module.exports.Transaction = Transaction;

module.exports.ParseTransaction = function(t){
  console.log(t.toJSON())
  if (t.get("query") && t.get("on")){
    var queryString = t.get("query")
    var on = t.get("on")
    var obj;
    switch (on.split(":").length){
      case 1:
        obj = "User"
        break;
      case 2:
        obj = "Deck"
        break;
      case 3:
        obj = "Card"
        break;
      default:
        return {error: "Invalid On Field", transaction: t};
    }

    t.set("for", obj);

    if (ValidateQuery(queryString, t)){
        return {error: null, transaction: t}
    }else{
      return {error:"Invalid Query", transaction: t}
    }

  }
  return {error: "No Query", transaction: t};
}

module.exports.UserHasAccess = function(obj, user){
  return (obj.get("owner") == user.get("username")) || (obj.get("collaborators").indexOf(user.get("username")) > -1)
}

module.exports.NewTransaction = function(t){
  var tSub = new Parse.Object("Transaction");
  Object.keys(t).forEach(function(key){tSub.set(key, t[key])});
  return tSub
}
