// database not really worth it because always querying in the same way
const express = require('express');
const app = express();
const mysql = require('mysql');

app.use(express.static('./public'));

app.get("/", (req, res) => {

    console.log("hi");
    const con = mysql.createConnection({
        host: "baileysnyder.com",
        user: "baileysn_user",
        password: "m}F)9ioHd#<h",
        database: "baileysn_jawords"
    });

    const getAllVerbsSQL = 'SELECT * FROM verbs';
    const getAllAdjectivesSQL = 'SELECT * FROM adjectives';

    function databaseError() {
        res.sendStatus(500);
    }

    con.connect(err => {
        if (err) {
            databaseError();
            return;
        }
        console.log("Connected!");
        con.query(getAllVerbsSQL, (err, result) => {
            if (err) {
                databaseError();
                return;
            }
            console.log(result);
        });
        con.query(getAllAdjectivesSQL, (err, result) => {
            if (err) {
                databaseError();
                return;
            }
            console.log(result);
          });
      });
})

const con = mysql.createConnection({
    host: "baileysnyder.com",
    user: "nice",
    password: "try",
    database: "guy"
});

const getAllVerbsSQL = 'SELECT * FROM verbs';
const getAllAdjectivesSQL = 'SELECT * FROM adjectives';

function databaseError() {
    res.sendStatus(500);
}

con.connect(err => {
    if (err) {
        databaseError();
        return;
    }
    console.log("Connected!");
    con.query(getAllVerbsSQL, (err, result) => {
        if (err) {
            databaseError();
            return;
        }
        console.log(result);
    });
    con.query(getAllAdjectivesSQL, (err, result) => {
        if (err) {
            databaseError();
            return;
        }
        console.log(result);
      });
  });

app.listen(3003, () => {
    console.log("Server is listening on 3003");
})