const program = require('commander');
const fs = require('fs');
const path = require('path');
const MailParser  = require('mailparser').MailParser;
const assert     = require('assert');
//const { expect } = require('chai');
//const through2   = require('through2');
const simpleParser = require('mailparser').simpleParser;
const mysql      = require('mysql');
const async = require('async')
const Mbox = require('node-mbox');

program.version('1.0.0');
program.option("-p, --path <path>", "Input path (file or directory)", "./mbox")
       .option("-c, --config <config>", "Config file", "./config/config.json")
       .usage("[global options]")
       .parse(process.argv);

console.log("Welcome to Yahoo Group Archive to WebView");
console.log("  Input path:" + program.path);
console.log("  Config file:" + program.config);

// load config file
try {
    var stat = fs.statSync(program.config)
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
}
let rawdata = fs.readFileSync(program.config);
let config = JSON.parse(rawdata);

// add single file or all files in directory in filesCollection array
let isPathDirectory = true;
try {
    var stat = fs.statSync(program.path);
    isPathDirectory = stat.isDirectory();
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
}

var filesCollection = [];
if (isPathDirectory) {
   readDirectorySynchronously(program.path);
} else {
   filesCollection.push(program.path); // add single file
}


function readDirectorySynchronously(directory) {
    var currentDirectory = fs.readdirSync(directory, 'utf8');

    currentDirectory.forEach(file => {
//        var fileShouldBeSkipped = directoriesToSkip.indexOf(file) > -1;
        var pathOfCurrentItem = path.join(directory + '/' + file);
        if (/*!fileShouldBeSkipped && */ fs.statSync(pathOfCurrentItem).isFile()) {
            filesCollection.push(pathOfCurrentItem);
        }
        else {  //} if (!fileShouldBeSkipped) {
            var directorypath = path.join(directory + '/' + file);
            readDirectorySynchronously(directorypath);
        }
    });
}

console.log(config);

console.log("Connect to db..."+ config.database);
// open database connection
var connection = mysql.createConnection({
  database : config.database,
  host     : config.db_host,
  user     : config.db_user,
  password : config.db_password,
});

var sqlUserTable = "CREATE TABLE IF NOT EXISTS `" + config.usertable +"` (\n" +
 "`id` int(11) NOT NULL auto_increment, \n" +
 "`username` varchar(250)  NOT NULL default '',\n" +
 "PRIMARY KEY  (`id`),\n" +
 "UNIQUE INDEX `username_UNIQUE` (`username` ASC),\n" +
 "INDEX `username_INDEX` (`username` ASC))\n" +
 "ENGINE = InnoDB\n" +
 "DEFAULT CHARACTER SET = utf8;"

 var sqlMsgTable = "CREATE TABLE IF NOT EXISTS `" + config.messagetable +"` (\n" +
  "`id` int(11) NOT NULL, \n" +
  "`date` DATETIME NULL,\n" +
  "`subject` VARCHAR(250) NULL,\n" +
  "`previd` int(11) NULL,\n" +
  "`nextid` int(11) NULL,\n" +
  "`userid` int(11) NULL,\n" +
  "PRIMARY KEY (`id`),\n" +
  "INDEX `message_DATE` (`date` ASC),\n" +
  "INDEX `fk_ymessage_user_idx` (`userid` ASC),\n" +
  "CONSTRAINT `fk_ymessage_user`\n" +
  "  FOREIGN KEY (`userid`)\n" +
  "  REFERENCES `" + config.usertable + "` (`id`)\n" +
  "  ON DELETE NO ACTION\n" +
  "  ON UPDATE NO ACTION)\n" +
  "ENGINE = InnoDB\n" +
  "DEFAULT CHARACTER SET = utf8;";

connection.connect(function(err) {
  if (err) {
      console.error('error connecting to database: ' + err.stack);
      process.exit(1);
  }
  console.log('connected as id ' + connection.threadId);
  connection.query(sqlUserTable, function(error, results, fields) {
     if (error) {
       console.error("usertable" + error);
       connection.end();
       throw error;
     }
     console.log("Creating table " + config.usertable + " was successful");

     // now build message table
     connection.query(sqlMsgTable, function(error, results, fields) {
       if (error) {
         console.error("messagetable" + error);
         connection.end();
         throw error;
       }
       console.log("Creating table " + config.messagetable + " was successful");

       // if flag is true then reset tables
       if (config.resetTables) {
          var dropSql = "DELETE FROM " + config.usertable + ";";
          connection.query(dropSql, function(error, results, fields) {
            if (error) console.error(error);
            dropSql = "DELETE FROM " + config.messagetable + ";";
            connection.query(dropSql, function(error, results, fields) {
              MBoxParse(); // start parsing the mbox file(s)
            });
          });
       } else {
         MBoxParse(); // start parsing the mbox file(s)
       }
     });
   });
});


/*
Parse through all mbox files
*/
let MBoxParse = function() {
  async.eachSeries(filesCollection, function(mboxFile, next) {
    console.log("Processing " + mboxFile + "...");
    ParseMbox(mboxFile);
    next();
  }, function(err) {
    console.log("iterations done");
    Finish();
  });
};

let Finish = function() {
  console.log("We are done!!!!!");
  process.exit(0);
};

// parse the mbox file
let ParseMbox = function(mboxFile) {
  console.log("Enter ParseMBox " + mboxFile);
  let mbox = new Mbox(mboxFile, {});
  mbox.on('message', function(msg) {
    simpleParser(msg, opts, (err, mail) => {
      if (mail.headers.has('subject'))
			{
				console.log("Subject: " + mail.headers.get('subject'));
			}
    });
  });

  mbox.on('error', function(err) {
    console.error('Err->', err);
  });

  mbox.on('end', function() {
    console.log("   Done");
  });

};


// now time to parse each input file into
/*

const Mbox       = require('./src/mbox');

const mbox = new Mbox('50795.mbox.00001', {  });

console.log(simpleParser);

mbox.on('message', function(msg) {
	// msg is a buffer instance
//	console.log("Msg->", msg.headers.keys()());
	let opts = {formatDateString: date => date.toUTCString()};
	simpleParser(msg, opts, (err, mail) => {
		if (mail)
		{
			//mail.headers.forEach(dispHeaders);
			if (mail.headers.has('subject'))
			{
				console.log("Subject: " + mail.headers.get('subject'));
			}
			if (mail.headers.has('from'))
			{
				var from = mail.headers.get('from').value[0];
				console.log("From: " + from.name + " <" + from.address + ">");
			}
			if (mail.headers.has('date'))
			{
				console.log("Date: " + mail.date);
			}
//Message-ID: <50795.1.24.959281621@eGroups.com>
// format is groupid.digestNum.messageNum.relayNum
			if (mail.messageId)
			{
				var mids = mail.messageId.split(".");
				var messageNum = mids[2];
				console.log("Msg #: " + messageNum);
			}
			if (mail.html)
			{
				console.log("HTML:" + mail.html);
			}
			else if (mail.text)
			{
		//		console.log("TEXT:" + mail.text);
			}

			console.log ("==============================");
		}
		else if (err)
		{
			console.log("****Message not parsed****");
		}
	});
});

mbox.on('error', function(err) {
	console.log('Err->', err);
});

mbox.on('end', function() {
	console.log('We are done-----------------------');
});

function dispHeaders(value, key, map) {
	console.log("  " + key + "=" + value);
}

*/
