
const express = require("express");
const mongoose = require("mongoose");
const _ = require("lodash");
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));


// using mongodb to store our data
mongoose.set('strictQuery', false);

// new database: todolistDB

// getting username and password from .env file
const user_name = process.env.USER_NAME;
const password = process.env.PASSWORD;


mongoose.connect(`mongodb+srv://${user_name}:${password}@cluster0.1qib2nf.mongodb.net/todolistDB`)

// schema
const itemSchema = mongoose.Schema({
  name: {
    type: String,
    // required: true
  }
});

// model, creating Items collection
const Item = mongoose.model("Item", itemSchema);

// new documents

const item1 = new Item({
  name: "Welcome to your to-do-list!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item"
});

const item3 = new Item({
  name: "<-- Hit this to delete an item"
});

const defaultItems = [item1, item2, item3];

// list Schema
const listSchema = mongoose.Schema({
  name: String,
  items: [itemSchema]
});

const List = mongoose.model("List", listSchema);

//--------------- FUNCTIONS ------------//
// insert all these items to our collection

function insertItems(itemList) {
  Item.insertMany(itemList, function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("Successfully saved default items to collection");
    }
  });
} 

async function saveItem(item) {
  await item.save(function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("Saved the newly added item to DB");
    }
  });
}


//--------- GET REUESTS ------------//

app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems) {

    if(err) {
      console.log(err);
    } else {
          // we insert only when foundItems is empty
      if(foundItems.length === 0) {
        insertItems(defaultItems);
        // as items when inserted first don't show up on our website
        res.redirect("/");
      } else {

        res.render("list", {listTitle: "Today", newListItems: foundItems});
      }

    }
  });

});


app.get("/about", function(req, res){
  res.render("about");
});


app.get("/:listName", function(req,res){
  const listName = _.capitalize(req.params.listName);

  List.findOne({name: listName}, function(err, list) {
    if(err) {
      console.log(err);
    } else {
      
      if(!list) {
        // create a new list if does not already exist
        const newList = new List({
          name: listName,
          items: defaultItems
        });

        saveItem(newList);

        res.redirect("/" + listName);
      } else {
        res.render("list", {listTitle: listName, newListItems: list.items});
        
      }
    }
  })
  
});


//--------------- POST REUESTS ----------------//

app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  // new document where the name is itemName
 
  const newItem = new Item({
    name: itemName
  });

  if(listName === "Today") {
    saveItem(newItem);  
    
    res.redirect("/");
  } else {
    // we are in a different list
    // check if the list already exists
    List.findOne({name: listName}, function(err, list) {
      if(!err){
        list.items.push(newItem);
        // adding the new item to the array items of the list
        saveItem(list);
        
        res.redirect("/" + listName);
      }
      
    });
  }
  // }
});

app.post("/delete", function(req, res) {

  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  // getting the value of the checkbox which gets checked
  if(listName === "Today"){
    Item.findByIdAndDelete(checkedItemId, function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log("Deleted the checked item");
        res.redirect("/");
      }
    });
  } else {
    // using $pull to remove item from array 
    List.updateOne(
      {
        name: listName
      },
      {
        $pull: {
          // from items array
          items: {
            _id: checkedItemId
          }
        }
      },
      function(err, list){
        // we have found the list and updated it
        // now redirect it
        if(!err) {
          res.redirect("/" + listName);
        }
      }
    );
  }
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
